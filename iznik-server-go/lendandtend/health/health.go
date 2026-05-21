package health

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers health check endpoint
func RegisterRoutes(app *fiber.App) {
	app.Get("/apiv2/lat/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
}
