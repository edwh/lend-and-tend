package payment

import (
	"bytes"
	"encoding/json"
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
func setupTestApp(t *testing.T, userId uint64) (*fiber.App, func()) {
	f, err := os.CreateTemp("", "lat_payment_test_*.db")
	require.NoError(t, err)
	dbPath := f.Name()
	f.Close()

	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)
	// Ensure no STRIPE_SECRET_KEY for MVP mock testing
	t.Setenv("STRIPE_SECRET_KEY", "")

	database.InitDatabase()

	// Run migrations
	database.AutoMigrateLendAndTend()

	app := fiber.New()

	// Inject auth middleware to set latUserId
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("latUserId", userId)
		return c.Next()
	})

	RegisterRoutes(app)

	return app, func() {
		os.Remove(dbPath)
	}
}

// createTestUser creates a user with given parameters
func createTestUser(t *testing.T, id uint64, email string, displayName string, paymentStatus string) *database.LATUser {
	user := &database.LATUser{
		ID:            id,
		Email:         email,
		PasswordHash:  "hash",
		DisplayName:   displayName,
		PaymentStatus: paymentStatus,
		IsAdmin:       false,
		Active:        true,
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

// TestCreatePaymentIntent_Mock verifies mock client secret is returned when no STRIPE_SECRET_KEY
func TestCreatePaymentIntent_Mock(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user := createTestUser(t, 1, "user@test.com", "Test User", "unpaid")
	_ = user

	resp, body := makeRequest(t, app, "POST", "/apiv2/lat/payment/intent", nil)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	require.NoError(t, err)

	// MVP: should return mock secret
	clientSecret, ok := result["clientSecret"].(string)
	require.True(t, ok, "clientSecret should be present")
	assert.NotEmpty(t, clientSecret)
	assert.Contains(t, clientSecret, "mock_secret_")

	assert.Equal(t, float64(1200), result["amount"], "amount should be 1200 pence")
	assert.Equal(t, "gbp", result["currency"], "currency should be gbp")
}

// TestConfirmPayment_UpdatesStatus verifies PaymentStatus becomes paid
func TestConfirmPayment_UpdatesStatus(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user := createTestUser(t, 1, "user@test.com", "Test User", "unpaid")
	assert.Equal(t, "unpaid", user.PaymentStatus)

	confirmBody := map[string]interface{}{
		"paymentIntentId": "mock_secret_12345",
	}
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/payment/confirm", confirmBody)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify user status is updated
	var updated database.LATUser
	database.DBConn.First(&updated, user.ID)
	assert.Equal(t, "paid", updated.PaymentStatus)
}

// TestConcession_UpdatesStatus verifies PaymentStatus becomes concession
func TestConcession_UpdatesStatus(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user := createTestUser(t, 1, "user@test.com", "Test User", "unpaid")
	assert.Equal(t, "unpaid", user.PaymentStatus)

	concessionBody := map[string]interface{}{
		"reason":      "universal_credit",
		"declaration": true,
	}
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/payment/concession", concessionBody)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify user status is updated
	var updated database.LATUser
	database.DBConn.First(&updated, user.ID)
	assert.Equal(t, "concession", updated.PaymentStatus)
}
