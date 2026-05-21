package messaging

import (
	"regexp"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
)

// SendMessageRequest is the request body for POST /apiv2/lat/message
type SendMessageRequest struct {
	RecipientID uint64 `json:"recipientId"`
	Content     string `json:"content"`
}

// SendMessageResponse is the response for sending a message
type SendMessageResponse struct {
	ID       uint64 `json:"id"`
	Flagged  bool   `json:"flagged"`
}

// MessageDTO is a message in a conversation
type MessageDTO struct {
	ID        uint64    `json:"id"`
	SenderID  uint64    `json:"senderId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

// GetThreadResponse is the response for getting a message thread
type GetThreadResponse struct {
	Messages []MessageDTO `json:"messages"`
}

// ConversationDTO represents a conversation summary
type ConversationDTO struct {
	OtherUserID      uint64    `json:"otherUserId"`
	OtherDisplayName string    `json:"otherDisplayName"`
	LastMessage      string    `json:"lastMessage"`
	LastAt           time.Time `json:"lastAt"`
	UnreadCount      int       `json:"unreadCount"`
}

// ConversationsResponse is the response for getting conversations
type ConversationsResponse struct {
	Conversations []ConversationDTO `json:"conversations"`
}

// ReviewMessageRequest is the request body for reviewing a message
type ReviewMessageRequest struct {
	Approve bool `json:"approve"`
}

// FlaggedMessageDTO is a flagged message for admin review
type FlaggedMessageDTO struct {
	ID                   uint64    `json:"id"`
	SenderID             uint64    `json:"senderId"`
	SenderDisplayName    string    `json:"senderDisplayName"`
	RecipientID          uint64    `json:"recipientId"`
	RecipientDisplayName string    `json:"recipientDisplayName"`
	Content              string    `json:"content"`
	CreatedAt            time.Time `json:"createdAt"`
}

// FlaggedMessagesResponse is the response for getting flagged messages
type FlaggedMessagesResponse struct {
	Messages []FlaggedMessageDTO `json:"messages"`
}

// SendMessage handles POST /apiv2/lat/message
func SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Check sender's payment status
	var sender database.LATUser
	if err := database.DBConn.Where("id = ?", userID).First(&sender).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "user not found"})
	}

	if sender.PaymentStatus == "unpaid" {
		return c.Status(402).JSON(fiber.Map{"error": "payment_required"})
	}

	// Check if sender has blocked the recipient
	var block database.LATBlockedUser
	err := database.DBConn.Where("blocker_id = ? AND blocked_id = ?", userID, req.RecipientID).First(&block).Error
	if err == nil {
		// Sender blocked the recipient
		return c.Status(400).JSON(fiber.Map{"error": "cannot send to blocked user"})
	}

	// Check if recipient has blocked sender
	err = database.DBConn.Where("blocker_id = ? AND blocked_id = ?", req.RecipientID, userID).First(&block).Error
	if err == nil {
		// Recipient blocked the sender
		return c.Status(403).JSON(fiber.Map{"error": "blocked by recipient"})
	}

	// Check word filters
	flagged := false
	var filters []database.LATWordFilter
	if err := database.DBConn.Find(&filters).Error; err == nil {
		for _, filter := range filters {
			// Try to compile and match regex
			if regex, err := regexp.Compile(filter.Pattern); err == nil {
				if regex.MatchString(req.Content) {
					if filter.Action == "block" {
						return c.Status(400).JSON(fiber.Map{"error": "message_blocked"})
					} else if filter.Action == "flag" {
						flagged = true
					}
				}
			}
		}
	}

	// Create message
	msg := &database.LATMessage{
		SenderID:    userID,
		RecipientID: req.RecipientID,
		Content:     req.Content,
		Flagged:     flagged,
		Reviewed:    false,
		Deleted:     false,
		CreatedAt:   time.Now(),
	}

	if err := database.DBConn.Create(msg).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to save message"})
	}

	return c.Status(200).JSON(SendMessageResponse{
		ID:      msg.ID,
		Flagged: flagged,
	})
}

// GetThread handles GET /apiv2/lat/message/thread/:otherUserId
func GetThread(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)
	otherUserID, _ := c.ParamsInt("otherUserId")

	if otherUserID == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	// Check if current user has been blocked by the other user
	var block database.LATBlockedUser
	err := database.DBConn.Where("blocker_id = ? AND blocked_id = ?", otherUserID, userID).First(&block).Error
	if err == nil {
		return c.Status(403).JSON(fiber.Map{"error": "blocked by user"})
	}

	// Check if current user has blocked the other user
	err = database.DBConn.Where("blocker_id = ? AND blocked_id = ?", userID, otherUserID).First(&block).Error
	if err == nil {
		return c.Status(403).JSON(fiber.Map{"error": "user is blocked"})
	}

	// Get all messages in this thread, ordered chronologically
	var messages []database.LATMessage
	query := database.DBConn.Where(
		"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
		userID, otherUserID, otherUserID, userID,
	).Where("deleted = ?", false).Order("created_at ASC").Limit(100)

	if err := query.Find(&messages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch messages"})
	}

	// Convert to DTOs
	var dtos []MessageDTO
	for _, msg := range messages {
		dtos = append(dtos, MessageDTO{
			ID:        msg.ID,
			SenderID:  msg.SenderID,
			Content:   msg.Content,
			CreatedAt: msg.CreatedAt,
		})
	}

	return c.Status(200).JSON(GetThreadResponse{
		Messages: dtos,
	})
}

// GetConversations handles GET /apiv2/lat/message/conversations
func GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	// Get list of users the current user has messaged with
	// For each, find the most recent message
	var conversations []ConversationDTO

	// Get distinct other user IDs from messages
	var otherUserIDs []uint64
	database.DBConn.Raw(`
		SELECT DISTINCT CASE
			WHEN sender_id = ? THEN recipient_id
			ELSE sender_id
		END as other_id
		FROM lat_messages
		WHERE (sender_id = ? OR recipient_id = ?)
		AND deleted = false
	`, userID, userID, userID).Scan(&otherUserIDs)

	// For each other user, get the last message and count unread
	for _, otherID := range otherUserIDs {
		// Check if blocked
		var block database.LATBlockedUser
		if database.DBConn.Where("blocker_id = ? AND blocked_id = ? OR blocker_id = ? AND blocked_id = ?",
			userID, otherID, otherID, userID).First(&block).Error == nil {
			continue // Skip blocked users
		}

		// Get other user's display name
		var otherUser database.LATUser
		if err := database.DBConn.Where("id = ?", otherID).First(&otherUser).Error; err != nil {
			continue
		}

		// Get last message
		var lastMsg database.LATMessage
		if err := database.DBConn.Where(
			"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userID, otherID, otherID, userID,
		).Where("deleted = ?", false).Order("created_at DESC").First(&lastMsg).Error; err != nil {
			continue
		}

		// Count unread messages from the other user
		var unreadCount int64
		database.DBConn.Where("sender_id = ? AND recipient_id = ? AND deleted = ?", otherID, userID, false).
			Model(&database.LATMessage{}).Count(&unreadCount)

		conversations = append(conversations, ConversationDTO{
			OtherUserID:      otherID,
			OtherDisplayName: otherUser.DisplayName,
			LastMessage:      lastMsg.Content,
			LastAt:           lastMsg.CreatedAt,
			UnreadCount:      int(unreadCount),
		})
	}

	return c.Status(200).JSON(ConversationsResponse{
		Conversations: conversations,
	})
}

// BlockUser handles POST /apiv2/lat/message/block/:userId
func BlockUser(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)
	blockID, _ := c.ParamsInt("userId")

	if blockID == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	if uint64(blockID) == userID {
		return c.Status(400).JSON(fiber.Map{"error": "cannot block yourself"})
	}

	// Create block relationship
	block := &database.LATBlockedUser{
		BlockerID: userID,
		BlockedID: uint64(blockID),
		CreatedAt: time.Now(),
	}

	if err := database.DBConn.Create(block).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to block user"})
	}

	return c.Status(200).JSON(fiber.Map{"ret": 0})
}

// GetFlagged handles GET /apiv2/lat/admin/messages/flagged
func GetFlagged(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	// Check if admin
	var user database.LATUser
	if err := database.DBConn.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "not authorized"})
	}

	if !user.IsAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "admin only"})
	}

	// Get flagged, unreviewed messages
	var messages []database.LATMessage
	if err := database.DBConn.Where("flagged = ? AND reviewed = ?", true, false).Find(&messages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch messages"})
	}

	// Convert to DTOs with user info
	var dtos []FlaggedMessageDTO
	for _, msg := range messages {
		var sender, recipient database.LATUser
		database.DBConn.Where("id = ?", msg.SenderID).First(&sender)
		database.DBConn.Where("id = ?", msg.RecipientID).First(&recipient)

		dtos = append(dtos, FlaggedMessageDTO{
			ID:                   msg.ID,
			SenderID:             msg.SenderID,
			SenderDisplayName:    sender.DisplayName,
			RecipientID:          msg.RecipientID,
			RecipientDisplayName: recipient.DisplayName,
			Content:              msg.Content,
			CreatedAt:            msg.CreatedAt,
		})
	}

	return c.Status(200).JSON(FlaggedMessagesResponse{
		Messages: dtos,
	})
}

// ReviewMessage handles POST /apiv2/lat/admin/messages/:id/review
func ReviewMessage(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)
	msgID, _ := c.ParamsInt("id")

	if msgID == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "invalid message id"})
	}

	// Check if admin
	var user database.LATUser
	if err := database.DBConn.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "not authorized"})
	}

	if !user.IsAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "admin only"})
	}

	var req ReviewMessageRequest
	if err := c.BodyParser(&req).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if !req.Approve {
		// Delete the message
		if err := database.DBConn.Where("id = ?", msgID).Delete(&database.LATMessage{}).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to delete message"})
		}
	} else {
		// Mark as reviewed
		if err := database.DBConn.Model(&database.LATMessage{}).Where("id = ?", msgID).Update("reviewed", true).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to update message"})
		}
	}

	return c.Status(200).JSON(fiber.Map{"ret": 0})
}
