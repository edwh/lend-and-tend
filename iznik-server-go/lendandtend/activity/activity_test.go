package activity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestApp creates a test database, registers routes, and returns a Fiber app
// and cleanup function.
func setupTestApp(t *testing.T) (*fiber.App, func()) {
	// Create temporary test database file
	f, err := os.CreateTemp("", "lat_activity_test_*.db")
	require.NoError(t, err)
	dbPath := f.Name()
	f.Close()

	// Set environment variables for SQLite
	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)

	// Initialize database
	database.InitDatabase()

	// Create Fiber app
	app := fiber.New()

	// Register routes
	RegisterRoutes(app)

	// Return app and cleanup function
	return app, func() {
		os.Remove(dbPath)
	}
}

// makeRequest helper to make an HTTP request
func makeRequest(t *testing.T, app *fiber.App, method, path string, body interface{}, cookie string) (*http.Response, string) {
	t.Helper()

	var bodyBytes []byte
	var err error
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		require.NoError(t, err)
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	if cookie != "" {
		req.Header.Set("Cookie", cookie)
	}

	resp, err := app.Test(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, string(respBody)
}

// createUserWithLocation creates a test user with location and travel radius
func createUserWithLocation(t *testing.T, email string, lat, lng float64, travelRadius int) database.LATUser {
	user := database.LATUser{
		Email:        email,
		PasswordHash: "dummy",
		DisplayName:  "Test User",
		Active:       true,
		Lat:          &lat,
		Lng:          &lng,
		TravelRadius: travelRadius,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		LastActiveAt: time.Now(),
	}
	err := database.DBConn.Create(&user).Error
	require.NoError(t, err)
	return user
}

// createSession creates a session for a user
func createSession(t *testing.T, userID uint64) string {
	sessionID := "test-session-" + time.Now().Format("20060102150405")
	session := database.LATSession{
		ID:        sessionID,
		UserID:    userID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	err := database.DBConn.Create(&session).Error
	require.NoError(t, err)
	return "lat_session=" + sessionID
}

// TestNotifyNearbyUsers_NoUsersNearby tests that no notifications are created
// when there are no existing users
func TestNotifyNearbyUsers_NoUsersNearby(t *testing.T) {
	_, cleanup := setupTestApp(t)
	defer cleanup()

	// Create a new user
	newUser := database.LATUser{
		Email:        "newuser@example.com",
		PasswordHash: "dummy",
		DisplayName:  "New User",
		Active:       true,
		Lat:          ptrFloat64(51.5074),
		Lng:          ptrFloat64(-0.1278),
		TravelRadius: 10,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		LastActiveAt: time.Now(),
	}
	err := database.DBConn.Create(&newUser).Error
	require.NoError(t, err)

	// Call NotifyNearbyUsers
	NotifyNearbyUsers(database.DBConn, newUser)

	// Wait a bit for goroutine to complete
	time.Sleep(100 * time.Millisecond)

	// Verify no notifications were created
	var notifications []database.LATNotification
	database.DBConn.Find(&notifications)
	assert.Empty(t, notifications, "no notifications should be created when no users exist")
}

// TestNotifyNearbyUsers_UserInRange tests that a notification is created
// when an existing user is within travel radius
func TestNotifyNearbyUsers_UserInRange(t *testing.T) {
	_, cleanup := setupTestApp(t)
	defer cleanup()

	// Create an existing user at London coordinates with 5km travel radius
	existingUser := createUserWithLocation(t, "existing@example.com", 51.5074, -0.1278, 5)

	// Create a new user 2km away
	newUser := database.LATUser{
		Email:        "newuser@example.com",
		PasswordHash: "dummy",
		DisplayName:  "New Gardener",
		Active:       true,
		Lat:          ptrFloat64(51.5174),
		Lng:          ptrFloat64(-0.1178),
		TravelRadius: 10,
		Role:         "lender",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		LastActiveAt: time.Now(),
	}
	err := database.DBConn.Create(&newUser).Error
	require.NoError(t, err)

	// Call NotifyNearbyUsers
	NotifyNearbyUsers(database.DBConn, newUser)

	// Wait a bit for goroutine to complete
	time.Sleep(200 * time.Millisecond)

	// Verify notification was created for existing user
	var notifications []database.LATNotification
	database.DBConn.Find(&notifications)
	assert.Len(t, notifications, 1, "notification should be created for nearby user")

	notification := notifications[0]
	assert.Equal(t, existingUser.ID, notification.UserID, "notification should be for existing user")
	assert.Equal(t, "new_match", notification.Type, "notification type should be new_match")
	assert.Equal(t, "New gardener near you!", notification.Title)
	assert.Contains(t, notification.Body, "lender", "body should contain role")
	assert.Equal(t, "/lat/map", *notification.Link)
	assert.False(t, notification.Read)
}

// TestNotifyNearbyUsers_UserOutOfRange tests that no notification is created
// when an existing user is outside their travel radius
func TestNotifyNearbyUsers_UserOutOfRange(t *testing.T) {
	_, cleanup := setupTestApp(t)
	defer cleanup()

	// Create an existing user at London with 3km travel radius
	_ = createUserWithLocation(t, "existing@example.com", 51.5074, -0.1278, 3)

	// Create a new user 10km away
	newUser := database.LATUser{
		Email:        "newuser@example.com",
		PasswordHash: "dummy",
		DisplayName:  "New Gardener",
		Active:       true,
		Lat:          ptrFloat64(51.5974),
		Lng:          ptrFloat64(-0.0278),
		TravelRadius: 10,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		LastActiveAt: time.Now(),
	}
	err := database.DBConn.Create(&newUser).Error
	require.NoError(t, err)

	// Call NotifyNearbyUsers
	NotifyNearbyUsers(database.DBConn, newUser)

	// Wait a bit for goroutine to complete
	time.Sleep(100 * time.Millisecond)

	// Verify no notification was created
	var notifications []database.LATNotification
	database.DBConn.Find(&notifications)
	assert.Empty(t, notifications, "no notification should be created for user outside travel radius")
}

// TestGetNotifications_Empty tests that an authenticated user with no notifications
// gets an empty list
func TestGetNotifications_Empty(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Create a user
	user := createUserWithLocation(t, "test@example.com", 51.5074, -0.1278, 5)

	// Create session
	sessionCookie := createSession(t, user.ID)

	// Make GET request
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/notifications", nil, sessionCookie)

	assert.Equal(t, 200, resp.StatusCode, "response code should be 200, got %d: %s", resp.StatusCode, body)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	notifications := result["notifications"].([]interface{})
	assert.Empty(t, notifications, "notifications should be empty")
	assert.Equal(t, float64(0), result["unreadCount"], "unreadCount should be 0")
}

// TestGetNotifications_ReturnsAndMarksRead tests that notifications are returned
// and marked as read after being fetched
func TestGetNotifications_ReturnsAndMarksRead(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Create a user
	user := createUserWithLocation(t, "test@example.com", 51.5074, -0.1278, 5)

	// Create two unread notifications
	notif1 := database.LATNotification{
		UserID:    user.ID,
		Type:      "new_match",
		Title:     "Notification 1",
		Body:      "Body 1",
		Read:      false,
		CreatedAt: time.Now(),
	}
	notif2 := database.LATNotification{
		UserID:    user.ID,
		Type:      "new_match",
		Title:     "Notification 2",
		Body:      "Body 2",
		Read:      false,
		CreatedAt: time.Now(),
	}
	database.DBConn.Create(&notif1)
	database.DBConn.Create(&notif2)

	// Create session
	sessionCookie := createSession(t, user.ID)

	// Make GET request
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/notifications", nil, sessionCookie)

	assert.Equal(t, 200, resp.StatusCode, "response code should be 200, got %d: %s", resp.StatusCode, body)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	notifications := result["notifications"].([]interface{})
	assert.Len(t, notifications, 2, "should return 2 notifications")
	assert.Equal(t, float64(2), result["unreadCount"], "unreadCount should be 2")

	// Verify notifications were marked as read
	var updatedNotifs []database.LATNotification
	database.DBConn.Where("user_id = ?", user.ID).Find(&updatedNotifs)
	assert.Len(t, updatedNotifs, 2)
	for _, n := range updatedNotifs {
		assert.True(t, n.Read, "all notifications should be marked as read")
	}
}

// TestMarkNotificationRead tests marking a single notification as read
func TestMarkNotificationRead(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Create a user
	user := createUserWithLocation(t, "test@example.com", 51.5074, -0.1278, 5)

	// Create a notification
	notif := database.LATNotification{
		UserID:    user.ID,
		Type:      "new_match",
		Title:     "Test Notification",
		Body:      "Test Body",
		Read:      false,
		CreatedAt: time.Now(),
	}
	database.DBConn.Create(&notif)

	// Create session
	sessionCookie := createSession(t, user.ID)

	// Make PATCH request using proper string formatting
	notifPath := fmt.Sprintf("/apiv2/lat/notifications/%d/read", notif.ID)
	resp, body := makeRequest(t, app, "PATCH", notifPath, nil, sessionCookie)

	assert.Equal(t, 200, resp.StatusCode, "response code should be 200, got %d: %s", resp.StatusCode, body)

	// Verify notification was marked as read
	var updatedNotif database.LATNotification
	database.DBConn.Where("id = ?", notif.ID).First(&updatedNotif)
	assert.True(t, updatedNotif.Read, "notification should be marked as read")
}

// TestGetNotifications_Unauthorized tests that unauthenticated users can't access notifications
func TestGetNotifications_Unauthorized(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Make GET request without session cookie
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/notifications", nil, "")

	assert.Equal(t, 401, resp.StatusCode, "response code should be 401, got %d: %s", resp.StatusCode, body)
}

// Helper function to create pointer to float64
func ptrFloat64(f float64) *float64 {
	return &f
}
