package agreement

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
	f, err := os.CreateTemp("", "lat_agr_test_*.db")
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

func TestCreateAgreement_Success(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	// Create lender and tender users
	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Lender creates agreement with tender
	resp, body := makeRequest(t, app, "POST", "/apiv2/lat/agreement", map[string]interface{}{
		"lenderId": lender.ID,
		"tenderId": tender.ID,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)
	assert.NotNil(t, result["id"])

	// Verify status is draft
	id := uint64(result["id"].(float64))
	var agreement database.LATAgreement
	db.First(&agreement, id)
	assert.Equal(t, "draft", agreement.Status)
	assert.Equal(t, lender.ID, agreement.LenderID)
	assert.Equal(t, tender.ID, agreement.TenderID)
}

func TestCreateAgreement_UnauthorizedThirdParty(t *testing.T) {
	app, cleanup := setupTestApp(t, 3)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}
	thirdparty := database.LATUser{Email: "third@test.com", DisplayName: "Third", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)
	db.Create(&thirdparty)

	// Third party tries to create agreement
	resp, _ := makeRequest(t, app, "POST", "/apiv2/lat/agreement", map[string]interface{}{
		"lenderId": lender.ID,
		"tenderId": tender.ID,
	})

	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestUpdateAgreement_SetFields(t *testing.T) {
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
		Status:   "draft",
	}
	db.Create(&agreement)

	// Update fields while in draft
	resp, body := makeRequest(t, app, "PATCH", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID), map[string]interface{}{
		"gardenAddress":  "123 Test Lane",
		"gardeningHours": "Weekends only",
		"maxPeople":      2,
	})

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)

	// Verify fields were updated
	var updated database.LATAgreement
	db.First(&updated, agreement.ID)
	assert.Equal(t, "123 Test Lane", *updated.GardenAddress)
	assert.Equal(t, "Weekends only", *updated.GardeningHours)
	assert.Equal(t, 2, *updated.MaxPeople)
}

func TestAgree_LenderOnly(t *testing.T) {
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
		Status:   "draft",
	}
	db.Create(&agreement)

	// Lender agrees
	resp, body := makeRequest(t, app, "POST", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID)+"/agree", nil)

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)
	assert.Equal(t, "lender_agreed", result["status"])

	// Verify status was updated
	var updated database.LATAgreement
	db.First(&updated, agreement.ID)
	assert.Equal(t, "lender_agreed", updated.Status)
	assert.NotNil(t, updated.LenderAgreedAt)
}

func TestAgree_BothParties(t *testing.T) {
	// Setup with lender ID=1
	app1, cleanup1 := setupTestApp(t, 1)
	defer cleanup1()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "draft",
	}
	db.Create(&agreement)

	// Lender agrees
	resp, _ := makeRequest(t, app1, "POST", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID)+"/agree", nil)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Tender agrees - need new app with tender ID
	app2, cleanup2 := setupTestApp(t, tender.ID)
	defer cleanup2()
	resp, body := makeRequest(t, app2, "POST", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID)+"/agree", nil)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)
	assert.Equal(t, "complete", result["status"])

	// Verify status was updated
	var updated database.LATAgreement
	db.First(&updated, agreement.ID)
	assert.Equal(t, "complete", updated.Status)
	assert.NotNil(t, updated.LenderAgreedAt)
	assert.NotNil(t, updated.TenderAgreedAt)

	// Verify check-ins were created (4 of them: 14, 30, 90, 180 days)
	var checkins []database.LATCheckin
	db.Where("agreement_id = ?", agreement.ID).Find(&checkins)
	assert.Equal(t, 4, len(checkins))

	// Verify scheduled times (roughly)
	now := time.Now()
	expectedDays := []int{14, 30, 90, 180}
	for i, days := range expectedDays {
		expectedTime := now.AddDate(0, 0, days)
		diff := checkins[i].ScheduledAt.Sub(expectedTime)
		assert.Less(t, diff, time.Hour)
		assert.Greater(t, diff, -time.Hour)
	}
}

func TestGetAgreementPDF_ReturnsContent(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	db := database.DBConn
	lender := database.LATUser{Email: "lender@test.com", DisplayName: "Lender Test", PasswordHash: "hash"}
	tender := database.LATUser{Email: "tender@test.com", DisplayName: "Tender Test", PasswordHash: "hash"}

	db.Create(&lender)
	db.Create(&tender)

	// Create agreement
	agreement := database.LATAgreement{
		LenderID: lender.ID,
		TenderID: tender.ID,
		Status:   "complete",
	}
	db.Create(&agreement)

	// Get PDF
	req, err := http.NewRequest("GET", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID)+"/pdf", nil)
	require.NoError(t, err)

	resp, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	assert.Equal(t, "application/pdf", resp.Header.Get("Content-Type"))

	pdfBytes, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Greater(t, len(pdfBytes), 0)
	// PDF files start with %PDF
	assert.True(t, bytes.HasPrefix(pdfBytes, []byte("%PDF")))
}

func TestGetAgreement(t *testing.T) {
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
		Status:   "draft",
	}
	db.Create(&agreement)

	// Get agreement as lender
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/agreement/"+fmt.Sprintf("%d", agreement.ID), nil)

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result database.LATAgreement
	err := json.Unmarshal([]byte(body), &result)
	assert.NoError(t, err)
	assert.Equal(t, agreement.ID, result.ID)
}

func TestMyAgreements(t *testing.T) {
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
		Status:   "draft",
	}
	db.Create(&agreement)

	// Get my agreements as lender
	resp, body := makeRequest(t, app, "GET", "/apiv2/lat/agreement/my", nil)

	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var results []database.LATAgreement
	err := json.Unmarshal([]byte(body), &results)
	assert.NoError(t, err)
	assert.Greater(t, len(results), 0)
	assert.Equal(t, agreement.ID, results[0].ID)
}
