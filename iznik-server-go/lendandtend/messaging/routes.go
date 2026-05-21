package messaging

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all messaging endpoints with the Fiber app
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")

	// Message endpoints
	lat.Get("/message/conversations", GetConversations)
	lat.Get("/message/thread/:otherUserId", GetThread)
	lat.Post("/message", SendMessage)
	lat.Post("/message/block/:userId", BlockUser)

	// Admin endpoints
	lat.Get("/admin/messages/flagged", GetFlagged)
	lat.Post("/admin/messages/:id/review", ReviewMessage)
}
