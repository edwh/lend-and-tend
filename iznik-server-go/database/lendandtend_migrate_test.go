package database_test

import (
	"os"
	"testing"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) func() {
	t.Helper()
	// Use a temp file so each test run is isolated.
	f, err := os.CreateTemp("", "lat_test_*.db")
	require.NoError(t, err)
	dbPath := f.Name()
	f.Close()

	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)

	database.InitDatabase()

	return func() {
		os.Remove(dbPath)
	}
}

func TestAutoMigrate_CreatesAllTables(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn
	require.NotNil(t, db)

	tables := []string{
		"lat_users",
		"lat_sessions",
		"lat_lender_profiles",
		"lat_tender_profiles",
		"lat_messages",
		"lat_agreements",
		"lat_checkins",
		"lat_notifications",
		"lat_blocked_users",
		"lat_word_filters",
		"lat_admin_impersonations",
	}

	for _, table := range tables {
		assert.True(t, db.Migrator().HasTable(table), "table %s should exist", table)
	}
}

func TestLATUser_CreateAndRead(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn

	email := "alice@example.com"
	user := database.LATUser{
		Email:        email,
		PasswordHash: "hashed",
		DisplayName:  "Alice",
		Role:         "lender",
	}
	result := db.Create(&user)
	require.NoError(t, result.Error)
	assert.NotZero(t, user.ID)

	var found database.LATUser
	db.First(&found, "email = ?", email)
	assert.Equal(t, "Alice", found.DisplayName)
	assert.Equal(t, "lender", found.Role)
	assert.Equal(t, "unpaid", found.PaymentStatus)
	assert.True(t, found.Active)
}

func TestLATUser_EmailUnique(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn

	u1 := database.LATUser{Email: "dup@example.com", PasswordHash: "h", DisplayName: "A", Role: "lender"}
	u2 := database.LATUser{Email: "dup@example.com", PasswordHash: "h", DisplayName: "B", Role: "tender"}

	require.NoError(t, db.Create(&u1).Error)
	assert.Error(t, db.Create(&u2).Error, "duplicate email should fail")
}

func TestLATSession_CreateAndExpiry(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn

	user := database.LATUser{Email: "bob@example.com", PasswordHash: "h", DisplayName: "Bob", Role: "tender"}
	require.NoError(t, db.Create(&user).Error)

	sess := database.LATSession{
		ID:        "test-session-id",
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	require.NoError(t, db.Create(&sess).Error)

	var found database.LATSession
	db.First(&found, "id = ?", "test-session-id")
	assert.Equal(t, user.ID, found.UserID)
	assert.True(t, found.ExpiresAt.After(time.Now()))
}

func TestLATMessage_CreateAndFlag(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn

	sender := database.LATUser{Email: "s@example.com", PasswordHash: "h", DisplayName: "S", Role: "tender"}
	recipient := database.LATUser{Email: "r@example.com", PasswordHash: "h", DisplayName: "R", Role: "lender"}
	require.NoError(t, db.Create(&sender).Error)
	require.NoError(t, db.Create(&recipient).Error)

	msg := database.LATMessage{
		SenderID:    sender.ID,
		RecipientID: recipient.ID,
		Content:     "Hello, I would love to tend your garden",
	}
	require.NoError(t, db.Create(&msg).Error)
	assert.False(t, msg.Flagged)

	// Flag it
	db.Model(&msg).Update("flagged", true)
	var found database.LATMessage
	db.First(&found, msg.ID)
	assert.True(t, found.Flagged)
}

func TestLATAgreement_DraftToComplete(t *testing.T) {
	teardown := setupTestDB(t)
	defer teardown()

	db := database.DBConn

	lender := database.LATUser{Email: "lender@example.com", PasswordHash: "h", DisplayName: "Lender", Role: "lender"}
	tender := database.LATUser{Email: "tender@example.com", PasswordHash: "h", DisplayName: "Tender", Role: "tender"}
	require.NoError(t, db.Create(&lender).Error)
	require.NoError(t, db.Create(&tender).Error)

	addr := "12 Garden Lane, London"
	agreement := database.LATAgreement{
		LenderID:      lender.ID,
		TenderID:      tender.ID,
		GardenAddress: &addr,
	}
	require.NoError(t, db.Create(&agreement).Error)
	assert.Equal(t, "draft", agreement.Status)

	// Lender agrees
	now := time.Now()
	db.Model(&agreement).Updates(map[string]interface{}{
		"status":           "lender_agreed",
		"lender_agreed_at": now,
	})

	// Tender agrees → complete
	db.Model(&agreement).Updates(map[string]interface{}{
		"status":           "complete",
		"tender_agreed_at": now,
	})

	var found database.LATAgreement
	db.First(&found, agreement.ID)
	assert.Equal(t, "complete", found.Status)
	assert.NotNil(t, found.LenderAgreedAt)
	assert.NotNil(t, found.TenderAgreedAt)
}
