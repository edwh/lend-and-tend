package checkin

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all L&T check-in routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")
	lat.Get("/checkin/pending", GetPendingCheckins)
	lat.Post("/checkin/:id/respond", RespondToCheckin)
}
