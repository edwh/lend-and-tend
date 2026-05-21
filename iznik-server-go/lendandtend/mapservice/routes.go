package mapservice

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all map service routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")

	// GET /apiv2/lat/map/pins — Returns blurred pin locations for map display
	lat.Get("/map/pins", GetPins)

	// GET /apiv2/lat/map/profile/:userId — Public profile for a user
	lat.Get("/map/profile/:userId", GetPublicProfile)
}
