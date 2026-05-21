package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"testing"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestApp creates a test database, registers routes, and returns a Fiber app
// and cleanup function.
func setupTestApp(t *testing.T) (*fiber.App, func()) {
	// Create temporary test database file
	f, err := os.CreateTemp("", "lat_auth_test_*.db")
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

// registerRequest helper to POST to an endpoint
func registerRequest(t *testing.T, app *fiber.App, method, path string, body interface{}) (*http.Response, string) {
	t.Helper()

	bodyBytes, err := json.Marshal(body)
	require.NoError(t, err)

	req, err := http.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, string(respBody)
}

// registerRequestWithCookie helper to make a request with session cookie
func registerRequestWithCookie(t *testing.T, app *fiber.App, method, path string, body interface{}, cookie string) (*http.Response, string) {
	t.Helper()

	bodyBytes, err := json.Marshal(body)
	require.NoError(t, err)

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

// extractSessionCookie extracts the lat_session cookie from response
func extractSessionCookie(t *testing.T, resp *http.Response) string {
	t.Helper()

	for _, cookie := range resp.Cookies() {
		if cookie.Name == "lat_session" {
			return cookie.Name + "=" + cookie.Value
		}
	}
	return ""
}

func TestRegister_Success(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})

	assert.Equal(t, 200, resp.StatusCode, "expected 200, got %d: %s", resp.StatusCode, body)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	// Verify response fields
	assert.NotNil(t, result["id"], "response should have id")
	assert.NotNil(t, result["sessionId"], "response should have sessionId")
	assert.False(t, result["profileComplete"].(bool), "profileComplete should be false initially")

	// Verify session cookie is set
	sessionCookie := extractSessionCookie(t, resp)
	assert.NotEmpty(t, sessionCookie, "session cookie should be set")
}

func TestRegister_DuplicateEmail(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register first user
	resp1, body1 := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "duplicate@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, resp1.StatusCode, "first register should succeed: %s", body1)

	// Try to register with same email
	resp2, body2 := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "duplicate@example.com",
		"password": "AnotherPassword123",
	})

	assert.Equal(t, 409, resp2.StatusCode, "duplicate email should return 409, got %d: %s", resp2.StatusCode, body2)
}

func TestRegister_WeakPassword(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "short",
	})

	assert.Equal(t, 400, resp.StatusCode, "weak password should return 400, got %d: %s", resp.StatusCode, body)
}

func TestRegister_InvalidEmail(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "invalid-email",
		"password": "ValidPassword123",
	})

	assert.Equal(t, 400, resp.StatusCode, "invalid email should return 400, got %d: %s", resp.StatusCode, body)
}

func TestLogin_Success(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user first
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Login with same credentials
	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/login", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})

	assert.Equal(t, 200, resp.StatusCode, "login should succeed, got %d: %s", resp.StatusCode, body)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	assert.NotNil(t, result["id"], "response should have id")
	assert.NotNil(t, result["sessionId"], "response should have sessionId")
	assert.False(t, result["profileComplete"].(bool), "profileComplete should be false")

	// Verify session cookie is set
	sessionCookie := extractSessionCookie(t, resp)
	assert.NotEmpty(t, sessionCookie, "session cookie should be set")
}

func TestLogin_WrongPassword(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user first
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Try login with wrong password
	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/login", map[string]string{
		"email":    "test@example.com",
		"password": "WrongPassword123",
	})

	assert.Equal(t, 401, resp.StatusCode, "wrong password should return 401, got %d: %s", resp.StatusCode, body)
}

func TestLogin_NonexistentUser(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/login", map[string]string{
		"email":    "nonexistent@example.com",
		"password": "ValidPassword123",
	})

	assert.Equal(t, 401, resp.StatusCode, "nonexistent user should return 401, got %d: %s", resp.StatusCode, body)
}

func TestWhoAmI_WithSession(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Extract session cookie
	sessionCookie := extractSessionCookie(t, registerResp)
	assert.NotEmpty(t, sessionCookie, "session cookie should be set")

	// Call whoami with session cookie
	req, err := http.NewRequest("GET", "/apiv2/lat/user/whoami", nil)
	require.NoError(t, err)
	req.Header.Set("Cookie", sessionCookie)

	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, 200, resp.StatusCode, "whoami should succeed with valid session")

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	var user map[string]interface{}
	err = json.Unmarshal(respBody, &user)
	assert.NoError(t, err)

	assert.Equal(t, "test@example.com", user["email"], "should return correct user email")
	assert.Nil(t, user["passwordHash"], "should not return passwordHash")
}

func TestWhoAmI_NoSession(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	req, err := http.NewRequest("GET", "/apiv2/lat/user/whoami", nil)
	require.NoError(t, err)

	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, 401, resp.StatusCode, "whoami without session should return 401")
}

func TestCompleteProfile_Success(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Extract session cookie
	sessionCookie := extractSessionCookie(t, registerResp)
	assert.NotEmpty(t, sessionCookie, "session cookie should be set")

	// Complete profile
	resp, body := registerRequestWithCookie(t, app, "POST", "/apiv2/lat/user/profile", map[string]interface{}{
		"displayName":  "Jane Gardener",
		"role":         "lender",
		"postcode":     "SW1A 1AA",
		"about":        "I have a small urban garden",
		"travelRadius": 5,
	}, sessionCookie)

	assert.Equal(t, 200, resp.StatusCode, "profile completion should succeed, got %d: %s", resp.StatusCode, body)

	var user map[string]interface{}
	err := json.Unmarshal([]byte(body), &user)
	assert.NoError(t, err)

	assert.Equal(t, "Jane Gardener", user["displayName"], "displayName should be updated")
	assert.Equal(t, "lender", user["role"], "role should be lender")
	assert.NotNil(t, user["lat"], "lat should be set from postcode lookup")
	assert.NotNil(t, user["lng"], "lng should be set from postcode lookup")
}

func TestCompleteProfile_InvalidRole(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Extract session cookie
	sessionCookie := extractSessionCookie(t, registerResp)

	// Try invalid role
	resp, body := registerRequestWithCookie(t, app, "POST", "/apiv2/lat/user/profile", map[string]interface{}{
		"displayName":  "Jane Gardener",
		"role":         "invalid",
		"postcode":     "SW1A 1AA",
		"about":        "I have a small urban garden",
		"travelRadius": 5,
	}, sessionCookie)

	assert.Equal(t, 400, resp.StatusCode, "invalid role should return 400, got %d: %s", resp.StatusCode, body)
}

func TestCompleteProfile_InvalidTravelRadius(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Extract session cookie
	sessionCookie := extractSessionCookie(t, registerResp)

	// Try travel radius > 50
	resp, body := registerRequestWithCookie(t, app, "POST", "/apiv2/lat/user/profile", map[string]interface{}{
		"displayName":  "Jane Gardener",
		"role":         "lender",
		"postcode":     "SW1A 1AA",
		"about":        "I have a small urban garden",
		"travelRadius": 100,
	}, sessionCookie)

	assert.Equal(t, 400, resp.StatusCode, "travel radius > 50 should return 400, got %d: %s", resp.StatusCode, body)
}

func TestCompleteProfile_NoSession(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	resp, body := registerRequest(t, app, "POST", "/apiv2/lat/user/profile", map[string]interface{}{
		"displayName":  "Jane Gardener",
		"role":         "lender",
		"postcode":     "SW1A 1AA",
		"about":        "I have a small urban garden",
		"travelRadius": 5,
	})

	assert.Equal(t, 401, resp.StatusCode, "profile without session should return 401, got %d: %s", resp.StatusCode, body)
}

func TestLogout_Success(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Register user
	registerResp, registerBody := registerRequest(t, app, "POST", "/apiv2/lat/user/register", map[string]string{
		"email":    "test@example.com",
		"password": "ValidPassword123",
	})
	assert.Equal(t, 200, registerResp.StatusCode, "register should succeed: %s", registerBody)

	// Extract session cookie
	sessionCookie := extractSessionCookie(t, registerResp)
	assert.NotEmpty(t, sessionCookie, "session cookie should be set")

	// Logout
	req, err := http.NewRequest("POST", "/apiv2/lat/user/logout", nil)
	require.NoError(t, err)
	req.Header.Set("Cookie", sessionCookie)

	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, 200, resp.StatusCode, "logout should succeed")

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	var result map[string]interface{}
	err = json.Unmarshal(respBody, &result)
	assert.NoError(t, err)
	assert.Equal(t, float64(0), result["ret"], "logout should return ret: 0")

	// Try to use old session
	req2, err := http.NewRequest("GET", "/apiv2/lat/user/whoami", nil)
	require.NoError(t, err)
	req2.Header.Set("Cookie", sessionCookie)

	resp2, err := app.Test(req2)
	require.NoError(t, err)

	assert.Equal(t, 401, resp2.StatusCode, "old session should be invalid after logout")
}

func TestLogout_NoSession(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	req, err := http.NewRequest("POST", "/apiv2/lat/user/logout", nil)
	require.NoError(t, err)

	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, 401, resp.StatusCode, "logout without session should return 401")
}
