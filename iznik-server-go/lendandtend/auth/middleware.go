package auth

import (
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// RequireAuth is middleware that validates lat_session cookie and sets latUserId in locals.
// Returns 401 if session is invalid or missing.
func RequireAuth(c *fiber.Ctx) error {
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
