package checkin

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

// setupTestApp creates a test database, registers routes, and returns a Fiber app with auth context
func setupTestApp(t *testing.T, userId uint64) (*fiber.App, func()) {
	// Create temporary test database file
	f, err := os.CreateTemp("", "lat_checkin_test_*.db")
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

	// Add context middleware that sets the authenticated user
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("latUserId", userId)
		return c.Next()
	})

	// Register routes
	RegisterRoutes(app)

	// Return app and cleanup function
	return app, func() {
		os.Remove(dbPath)
	}
}

// makeRequest helper to make HTTP requests to the test app
func makeRequest(t *testing.T, app *fiber.App, method, path string, body interface{}) (*http.Response, string) {
	t.Helper()

	var req *http.Request
	var err error

	if body != nil {
		bodyBytes, err := json.Marshal(body)
		require.NoError(t, err)
		req, err = http.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(method, path, nil)
		require.NoError(t, err)
	}

	resp, err := app.Test(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, string(respBody)
}

func TestGetPendingCheckins(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Create a pending check-in (scheduled in the past)
	pendingCheckin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-1 * time.Hour),
		SentAt:      nil, // Not sent yet
	}
	db.Create(&pendingCheckin)

	// Create a sent check-in (should not appear)
	sentTime := time.Now()
	sentCheckin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-2 * time.Hour),
		SentAt:      &sentTime,
	}
	db.Create(&sentCheckin)

	// Get pending check-ins as lender
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/checkin/pending", nil)

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var results []database.LATCheckin
	err := json.Unmarshal([]byte(body), &results)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(results))
	assert.Equal(t, pendingCheckin.ID, results[0].ID)
}

func TestRespondToCheckin_Growing(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Create check-in
	checkin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-1 * time.Hour),
	}
	db.Create(&checkin)

	// Lender responds with "growing"
	resp, body := makeRequest(t, app, "POST", "/apiv2/lat/checkin/"+fmt.Sprintf("%d", checkin.ID)+"/respond", map[string]interface{}{
		"status":          "growing",
		"needsMediation": false,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	// Verify status was saved
	var updated database.LATCheckin
	db.First(&updated, checkin.ID)
	assert.Equal(t, "growing", *updated.LenderStatus)
	assert.NotNil(t, updated.SentAt)
	assert.False(t, updated.NeedsMediation)
}

func TestRespondToCheckin_Ok(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Create check-in
	checkin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-1 * time.Hour),
	}
	db.Create(&checkin)

	// Lender responds with "ok"
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/checkin/"+fmt.Sprintf("%d", checkin.ID)+"/respond", map[string]interface{}{
		"status":          "ok",
		"needsMediation": false,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Verify status was saved
	var updated database.LATCheckin
	db.First(&updated, checkin.ID)
	assert.Equal(t, "ok", *updated.LenderStatus)
	assert.NotNil(t, updated.SentAt)
}

func TestRespondToCheckin_NotWorking(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Create check-in
	checkin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-1 * time.Hour),
	}
	db.Create(&checkin)

	// Lender responds with "not_working"
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/checkin/"+string(rune(checkin.ID))+"/respond", map[string]interface{}{
		"status":          "not_working",
		"needsMediation": true,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Verify status and mediation flag were saved
	var updated database.LATCheckin
	db.First(&updated, checkin.ID)
	assert.Equal(t, "not_working", *updated.LenderStatus)
	assert.True(t, updated.NeedsMediation)
	assert.NotNil(t, updated.SentAt)
}

func TestRespondToCheckin_TenderResponse(t *testing.T) {
	app, cleanup := setupTestApp(t, 2)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Create check-in
	checkin := database.LATCheckin{
		AgreementID: agreement.ID,
		ScheduledAt: time.Now().Add(-1 * time.Hour),
	}
	db.Create(&checkin)

	// Tender responds with "ok"
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/checkin/"+string(rune(checkin.ID))+"/respond", map[string]interface{}{
		"status":          "ok",
		"needsMediation": false,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Verify tender status was saved (not lender)
	var updated database.LATCheckin
	db.First(&updated, checkin.ID)
	assert.Equal(t, "ok", *updated.TenderStatus)
	assert.Nil(t, updated.LenderStatus)
}
