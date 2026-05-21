package activity

import (
	"fmt"
	"log"
	"math"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// NotifyNearbyUsers creates notifications for existing users within travel radius
// of a newly registered user. Runs asynchronously in a goroutine.
func NotifyNearbyUsers(db *gorm.DB, newUser database.LATUser) {
	go func() {
		// Only process if new user has location data
		if newUser.Lat == nil || newUser.Lng == nil {
			return
		}

		// Query all active users that have location set
		var existingUsers []database.LATUser
		if err := db.Where("active = ? AND lat IS NOT NULL AND lng IS NOT NULL AND id != ?", true, newUser.ID).Find(&existingUsers).Error; err != nil {
			log.Printf("error querying existing users: %v", err)
			return
		}

		// For each existing user, check if new user is within their travel radius
		for _, existingUser := range existingUsers {
			if existingUser.Lat == nil || existingUser.Lng == nil {
				continue
			}

			distance := haversineKm(*existingUser.Lat, *existingUser.Lng, *newUser.Lat, *newUser.Lng)

			// If new user is within existing user's travel radius, create notification
			if distance <= float64(existingUser.TravelRadius) {
				roleText := newUser.Role
				if newUser.Role == "both" {
					roleText = "gardener"
				}

				notification := database.LATNotification{
					UserID:    existingUser.ID,
					Type:      "new_match",
					Title:     "New gardener near you!",
					Body:      fmt.Sprintf("A new %s has joined within %dkm of your location. Log in to see the map!", roleText, existingUser.TravelRadius),
					Link:      strPtr("/lat/map"),
					Read:      false,
					CreatedAt: time.Now(),
				}

				if err := db.Create(&notification).Error; err != nil {
					log.Printf("error creating notification for user %d: %v", existingUser.ID, err)
				}
			}
		}
	}()
}

// haversineKm calculates the distance between two points in kilometers
// using the haversine formula
func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth radius in kilometers
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

// NotificationsResponse is the response for GET /apiv2/lat/notifications
type NotificationsResponse struct {
	Notifications []database.LATNotification `json:"notifications"`
	UnreadCount   int                        `json:"unreadCount"`
}

// GetNotifications handles GET /apiv2/lat/notifications
// Returns all unread notifications for the authenticated user and marks them as read
func GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	// Query all unread notifications for this user
	var notifications []database.LATNotification
	if err := database.DBConn.Where("user_id = ? AND read = ?", userID, false).Order("created_at DESC").Find(&notifications).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to fetch notifications"})
	}

	unreadCount := len(notifications)

	// Mark all returned notifications as read
	if len(notifications) > 0 {
		notifIDs := make([]uint64, len(notifications))
		for i, n := range notifications {
			notifIDs[i] = n.ID
		}
		if err := database.DBConn.Model(&database.LATNotification{}).Where("id IN ?", notifIDs).Update("read", true).Error; err != nil {
			log.Printf("error marking notifications as read: %v", err)
			// Don't fail the request, just log the error
		}
	}

	return c.Status(200).JSON(NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

// MarkNotificationReadRequest is the request for PATCH /apiv2/lat/notifications/:id/read
type MarkNotificationReadRequest struct {
	// Empty body for PATCH request
}

// MarkNotificationRead handles PATCH /apiv2/lat/notifications/:id/read
// Marks a single notification as read for the authenticated user
func MarkNotificationRead(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)
	notifID := c.Params("id")

	// Parse notification ID
	var notifIDUint uint64
	_, err := fmt.Sscanf(notifID, "%d", &notifIDUint)
	if err != nil {
		return c.Status(400).JSON(map[string]string{"error": "invalid notification id"})
	}

	// Verify the notification belongs to the authenticated user
	var notification database.LATNotification
	if err := database.DBConn.Where("id = ? AND user_id = ?", notifIDUint, userID).First(&notification).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(404).JSON(map[string]string{"error": "notification not found"})
		}
		return c.Status(500).JSON(map[string]string{"error": "database error"})
	}

	// Update notification to mark as read
	if err := database.DBConn.Model(&notification).Update("read", true).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to update notification"})
	}

	return c.Status(200).JSON(map[string]interface{}{
		"id":   notification.ID,
		"read": true,
	})
}

// requireAuth is a minimal authentication middleware for activity routes
func requireAuth(c *fiber.Ctx) error {
	sessionID := c.Cookies("lat_session")
	if sessionID == "" {
		return c.Status(401).JSON(map[string]string{"error": "unauthorized"})
	}

	// Look up session in database
	var session database.LATSession
	result := database.DBConn.Where("id = ? AND expires_at > ?", sessionID, time.Now()).First(&session)
	if result.Error == gorm.ErrRecordNotFound {
		return c.Status(401).JSON(map[string]string{"error": "unauthorized"})
	} else if result.Error != nil {
		return c.Status(500).JSON(map[string]string{"error": "database error"})
	}

	// Set user ID in locals
	c.Locals("latUserId", session.UserID)

	return c.Next()
}

// RegisterRoutes registers all activity routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")
	lat.Get("/notifications", requireAuth, GetNotifications)
	lat.Patch("/notifications/:id/read", requireAuth, MarkNotificationRead)
}

// strPtr is a helper to create a pointer to a string
func strPtr(s string) *string {
	return &s
}
