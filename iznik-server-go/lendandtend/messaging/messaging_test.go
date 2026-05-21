package messaging

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

// setupTestApp creates a test Fiber app with auth and routes registered
func setupTestApp(t *testing.T, userId uint64) (*fiber.App, func()) {
	f, err := os.CreateTemp("", "lat_msg_test_*.db")
	require.NoError(t, err)
	dbPath := f.Name()
	f.Close()

	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)
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
func createTestUser(t *testing.T, id uint64, displayName string, paymentStatus string, isAdmin bool) *database.LATUser {
	user := &database.LATUser{
		ID:            id,
		Email:         fmt.Sprintf("user%d@test.com", id),
		PasswordHash:  "hash",
		DisplayName:   displayName,
		PaymentStatus: paymentStatus,
		IsAdmin:       isAdmin,
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
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, string(respBody)
}

// TestSendMessage_Success sends a message successfully
func TestSendMessage_Success(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	sender := createTestUser(t, 1, "Sender", "paid", false)
	recipient := createTestUser(t, 2, "Recipient", "unpaid", false)

	body := SendMessageRequest{
		RecipientID: recipient.ID,
		Content:     "Hello, World!",
	}

	resp, respBody := makeRequest(t, app, "POST", "/apiv2/lat/message", body)

	assert.Equal(t, 200, resp.StatusCode, "expected status 200, got %d: %s", resp.StatusCode, respBody)

	var result SendMessageResponse
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.NotZero(t, result.ID, "expected message ID to be set")
	assert.False(t, result.Flagged, "expected message to not be flagged")

	// Verify message was saved
	var msg database.LATMessage
	err = database.DBConn.Where("id = ?", result.ID).First(&msg).Error
	assert.NoError(t, err, "message should exist in database")

	assert.Equal(t, sender.ID, msg.SenderID, "sender ID should match")
	assert.Equal(t, recipient.ID, msg.RecipientID, "recipient ID should match")
	assert.Equal(t, "Hello, World!", msg.Content, "content should match")
}

// TestSendMessage_PaywallBlocked tests that unpaid users cannot send
func TestSendMessage_PaywallBlocked(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	_ = createTestUser(t, 1, "Sender", "unpaid", false)
	recipient := createTestUser(t, 2, "Recipient", "paid", false)

	body := SendMessageRequest{
		RecipientID: recipient.ID,
		Content:     "Hello!",
	}

	resp, respBody := makeRequest(t, app, "POST", "/apiv2/lat/message", body)

	assert.Equal(t, 402, resp.StatusCode, "expected status 402, got %d: %s", resp.StatusCode, respBody)

	var result map[string]string
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.Equal(t, "payment_required", result["error"], "error should be payment_required")
}

// TestSendMessage_WordFilterFlag tests that flagged messages are marked
func TestSendMessage_WordFilterFlag(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	_ = createTestUser(t, 1, "Sender", "paid", false)
	recipient := createTestUser(t, 2, "Recipient", "paid", false)

	// Add a flag filter
	filter := &database.LATWordFilter{
		Pattern: "badword",
		Action:  "flag",
	}
	database.DBConn.Create(filter)

	body := SendMessageRequest{
		RecipientID: recipient.ID,
		Content:     "This is a badword message",
	}

	resp, respBody := makeRequest(t, app, "POST", "/apiv2/lat/message", body)

	assert.Equal(t, 200, resp.StatusCode, "expected status 200, got %d: %s", resp.StatusCode, respBody)

	var result SendMessageResponse
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.True(t, result.Flagged, "expected message to be flagged")

	// Verify in database
	var msg database.LATMessage
	err = database.DBConn.Where("id = ?", result.ID).First(&msg).Error
	assert.NoError(t, err)
	assert.True(t, msg.Flagged, "message should be flagged in database")
}

// TestSendMessage_WordFilterBlock tests that blocked messages are rejected
func TestSendMessage_WordFilterBlock(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	_ = createTestUser(t, 1, "Sender", "paid", false)
	recipient := createTestUser(t, 2, "Recipient", "paid", false)

	// Add a block filter
	filter := &database.LATWordFilter{
		Pattern: "blocked",
		Action:  "block",
	}
	database.DBConn.Create(filter)

	body := SendMessageRequest{
		RecipientID: recipient.ID,
		Content:     "This contains blocked content",
	}

	resp, respBody := makeRequest(t, app, "POST", "/apiv2/lat/message", body)

	assert.Equal(t, 400, resp.StatusCode, "expected status 400, got %d: %s", resp.StatusCode, respBody)

	var result map[string]string
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.Equal(t, "message_blocked", result["error"], "error should be message_blocked")
}

// TestSendMessage_BlockedBySender tests that sender cannot message blocked recipient
func TestSendMessage_BlockedBySender(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	sender := createTestUser(t, 1, "Sender", "paid", false)
	recipient := createTestUser(t, 2, "Recipient", "paid", false)

	// Block the recipient
	blocked := &database.LATBlockedUser{
		BlockerID: sender.ID,
		BlockedID: recipient.ID,
		CreatedAt: time.Now(),
	}
	database.DBConn.Create(blocked)

	body := SendMessageRequest{
		RecipientID: recipient.ID,
		Content:     "Hello!",
	}

	resp, respBody := makeRequest(t, app, "POST", "/apiv2/lat/message", body)

	assert.Equal(t, 400, resp.StatusCode, "expected status 400, got %d: %s", resp.StatusCode, respBody)
}

// TestGetThread_Success retrieves messages in order
func TestGetThread_Success(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user1 := createTestUser(t, 1, "User1", "paid", false)
	user2 := createTestUser(t, 2, "User2", "paid", false)

	// Create 3 messages
	for i := 1; i <= 3; i++ {
		msg := &database.LATMessage{
			SenderID:    user1.ID,
			RecipientID: user2.ID,
			Content:     fmt.Sprintf("Message %d", i),
			CreatedAt:   time.Now().Add(time.Duration(i) * time.Second),
		}
		database.DBConn.Create(msg)
	}

	resp, respBody := makeRequest(t, app, "GET", fmt.Sprintf("/apiv2/lat/message/thread/%d", user2.ID), nil)

	assert.Equal(t, 200, resp.StatusCode, "expected status 200, got %d: %s", resp.StatusCode, respBody)

	var result GetThreadResponse
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.Len(t, result.Messages, 3, "expected 3 messages")

	// Verify chronological order
	for i := 0; i < 3; i++ {
		expected := fmt.Sprintf("Message %d", i+1)
		assert.Equal(t, expected, result.Messages[i].Content, "message content should be in order")
	}
}

// TestGetConversations_Success lists conversations
func TestGetConversations_Success(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user1 := createTestUser(t, 1, "User1", "paid", false)
	user2 := createTestUser(t, 2, "User2", "paid", false)
	user3 := createTestUser(t, 3, "User3", "paid", false)

	// Create messages in two conversations
	msg1 := &database.LATMessage{
		SenderID:    user1.ID,
		RecipientID: user2.ID,
		Content:     "Hello User2",
		CreatedAt:   time.Now().Add(-2 * time.Hour),
	}
	database.DBConn.Create(msg1)

	msg2 := &database.LATMessage{
		SenderID:    user3.ID,
		RecipientID: user1.ID,
		Content:     "Hello User1",
		CreatedAt:   time.Now().Add(-1 * time.Hour),
	}
	database.DBConn.Create(msg2)

	resp, respBody := makeRequest(t, app, "GET", "/apiv2/lat/message/conversations", nil)

	assert.Equal(t, 200, resp.StatusCode, "expected status 200, got %d: %s", resp.StatusCode, respBody)

	var result ConversationsResponse
	err := json.Unmarshal([]byte(respBody), &result)
	assert.NoError(t, err)

	assert.Len(t, result.Conversations, 2, "expected 2 conversations")
}

// TestGetFlagged_AdminOnly tests admin-only access to flagged messages
func TestGetFlagged_AdminOnly(t *testing.T) {
	// Test 1: Non-admin cannot access flagged messages
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	_ = createTestUser(t, 1, "User1", "paid", false)
	_ = createTestUser(t, 2, "Admin", "paid", true)

	resp, respBody := makeRequest(t, app, "GET", "/apiv2/lat/admin/messages/flagged", nil)

	assert.Equal(t, 403, resp.StatusCode, "non-admin should get 403, got %d: %s", resp.StatusCode, respBody)

	// Test 2: Admin can access flagged messages
	app2, cleanup2 := setupTestApp(t, 2)
	defer cleanup2()

	user1b := createTestUser(t, 1, "User1", "paid", false)
	adminUser := createTestUser(t, 2, "Admin", "paid", true)

	// Create a flagged message
	flagged := &database.LATMessage{
		SenderID:    user1b.ID,
		RecipientID: adminUser.ID,
		Content:     "Bad content",
		Flagged:     true,
		Reviewed:    false,
		CreatedAt:   time.Now(),
	}
	database.DBConn.Create(flagged)

	resp2, respBody2 := makeRequest(t, app2, "GET", "/apiv2/lat/admin/messages/flagged", nil)

	assert.Equal(t, 200, resp2.StatusCode, "admin should get 200, got %d: %s", resp2.StatusCode, respBody2)

	var result FlaggedMessagesResponse
	err := json.Unmarshal([]byte(respBody2), &result)
	assert.NoError(t, err)

	assert.Len(t, result.Messages, 1, "admin should see 1 flagged message")
}

// TestBlockUser_Success blocks a user
func TestBlockUser_Success(t *testing.T) {
	app, cleanup := setupTestApp(t, 1)
	defer cleanup()

	user1 := createTestUser(t, 1, "User1", "paid", false)
	user2 := createTestUser(t, 2, "User2", "paid", false)

	resp, respBody := makeRequest(t, app, "POST", fmt.Sprintf("/apiv2/lat/message/block/%d", user2.ID), nil)

	assert.Equal(t, 200, resp.StatusCode, "expected status 200, got %d: %s", resp.StatusCode, respBody)

	// Verify block was created
	var block database.LATBlockedUser
	err := database.DBConn.Where("blocker_id = ? AND blocked_id = ?", user1.ID, user2.ID).First(&block).Error
	assert.NoError(t, err, "block should exist in database")
}
