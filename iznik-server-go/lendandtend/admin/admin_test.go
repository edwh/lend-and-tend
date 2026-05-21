package admin

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

// setupTestApp creates a test Fiber app with routes registered
func setupTestApp(t *testing.T, userId uint64, isAdmin bool) (*fiber.App, func()) {
	f, err := os.CreateTemp("", "lat_admin_test_*.db")
	require.NoError(t, err)
	dbPath := f.Name()
	f.Close()

	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)
	database.InitDatabase()

	// Run migrations
	database.AutoMigrateLendAndTend()

	app := fiber.New()

	// Inject auth middleware to set latUserId and isAdmin
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("latUserId", userId)
		c.Locals("isAdmin", isAdmin)
		return c.Next()
	})

	RegisterRoutes(app)

	return app, func() {
		os.Remove(dbPath)
	}
}

// createTestUser creates a user with given parameters
func createTestUser(t *testing.T, id uint64, email string, displayName string, role string, paymentStatus string, isAdmin bool, active bool) *database.LATUser {
	user := &database.LATUser{
		ID:            id,
		Email:         email,
		PasswordHash:  "hash",
		DisplayName:   displayName,
		Role:          role,
		PaymentStatus: paymentStatus,
		IsAdmin:       isAdmin,
		Active:        active,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		LastActiveAt:  time.Now(),
	}

	if err := database.DBConn.Create(user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return user
}

// makeRequest is a helper to make HTTP requests to the test app
func makeRequest(t *testing.T, app *fiber.App, method, path string, body interface{}) (*http.Response, string) {
	t.Helper()

	var bodyBytes []byte
	var err error
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		require.NoError(t, err)
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := app.Test(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, string(respBody)
}

// TestListUsers_AdminOnly verifies non-admin gets 403
func TestListUsers_AdminOnly(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, false) // Not admin
	defer cleanup()

	resp, _ := makeRequest(t, app, "GET", "/apiv2/lat/admin/users", nil)
	assert.Equal(t, 403, resp.StatusCode)
}

// TestListUsers_FilterByRole verifies filtering works correctly
func TestListUsers_FilterByRole(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, true) // Admin
	defer cleanup()

	// Create test users
	createTestUser(t, 2, "lender@test.com", "Lender User", "lender", "paid", false, true)
	createTestUser(t, 3, "tender@test.com", "Tender User", "tender", "unpaid", false, true)
	createTestUser(t, 4, "both@test.com", "Both User", "both", "concession", false, true)

	// Test lender filter
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/admin/users?role=lender", nil)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	require.NoError(t, err)

	users, ok := result["users"].([]interface{})
	require.True(t, ok, "users should be an array")
	assert.Equal(t, 1, len(users), "should have 1 lender")
}

// TestUpdateUser_BanUser verifies setting Active=false bans user
func TestUpdateUser_BanUser(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, true) // Admin
	defer cleanup()

	user := createTestUser(t, 2, "user@test.com", "Test User", "both", "paid", false, true)
	assert.True(t, user.Active)

	updateBody := map[string]interface{}{
		"active": false,
	}
	resp, _ := makeRequest(t, app, "PATCH", fmt.Sprintf("/apiv2/lat/admin/users/%d", user.ID), updateBody)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify user is now inactive
	var updated database.LATUser
	database.DBConn.First(&updated, user.ID)
	assert.False(t, updated.Active)
}

// TestUpdateUser_GrantConcession verifies setting PaymentStatus to concession
func TestUpdateUser_GrantConcession(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, true) // Admin
	defer cleanup()

	user := createTestUser(t, 2, "user@test.com", "Test User", "both", "unpaid", false, true)
	assert.Equal(t, "unpaid", user.PaymentStatus)

	updateBody := map[string]interface{}{
		"paymentStatus": "concession",
	}
	resp, _ := makeRequest(t, app, "PATCH", fmt.Sprintf("/apiv2/lat/admin/users/%d", user.ID), updateBody)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify user has concession status
	var updated database.LATUser
	database.DBConn.First(&updated, user.ID)
	assert.Equal(t, "concession", updated.PaymentStatus)
}

// TestImpersonate_CreatesAuditRecord verifies impersonation creates audit record
func TestImpersonate_CreatesAuditRecord(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, true) // Admin
	defer cleanup()

	targetUser := createTestUser(t, 2, "target@test.com", "Target User", "both", "paid", false, true)

	resp, body := makeRequest(t, app, "POST", fmt.Sprintf("/apiv2/lat/admin/impersonate/%d", targetUser.ID), nil)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	require.NoError(t, err)

	impersonating, ok := result["impersonating"].(float64)
	require.True(t, ok)
	assert.Equal(t, float64(targetUser.ID), impersonating)

	// Verify audit record was created
	var audit database.LATAdminImpersonation
	database.DBConn.Where("admin_id = ? AND target_id = ?", 1, targetUser.ID).First(&audit)
	assert.NotZero(t, audit.ID)
	assert.Equal(t, uint64(1), audit.AdminID)
	assert.Equal(t, targetUser.ID, audit.TargetID)
}

// TestGetMetrics_Counts verifies metrics are calculated correctly
func TestGetMetrics_Counts(t *testing.T) {
	app, cleanup := setupTestApp(t, 1, true) // Admin
	defer cleanup()

	// Create admin user first
	createTestUser(t, 1, "admin@test.com", "Admin", "both", "paid", true, true)

	// Create various users
	createTestUser(t, 2, "lender@test.com", "Lender", "lender", "paid", false, true)
	createTestUser(t, 3, "tender@test.com", "Tender", "tender", "paid", false, true)
	createTestUser(t, 4, "both@test.com", "Both", "both", "unpaid", false, true)
	createTestUser(t, 5, "inactive@test.com", "Inactive", "lender", "paid", false, false)

	// Create an active agreement
	agreement := &database.LATAgreement{
		ID:       1,
		LenderID: 2,
		TenderID: 3,
		Status:   "lender_agreed",
	}
	database.DBConn.Create(agreement)

	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/admin/metrics", nil)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	require.NoError(t, err)

	assert.True(t, result["totalUsers"].(float64) >= 4, "should have at least 4 active users")
	assert.True(t, result["lenders"].(float64) >= 2, "should have at least 2 lenders")
	assert.True(t, result["tenders"].(float64) >= 2, "should have at least 2 tenders")
	assert.True(t, result["paidUsers"].(float64) >= 2, "should have at least 2 paid users")
	assert.Equal(t, float64(1), result["activeAgreements"], "should have 1 active agreement")
}
