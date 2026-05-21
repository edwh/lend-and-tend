package auth

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all L&T auth routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")
	lat.Post("/user/register", Register)
	lat.Post("/user/profile", RequireAuth, CompleteProfile)
	lat.Post("/user/login", Login)
	lat.Post("/user/logout", RequireAuth, Logout)
	lat.Get("/user/whoami", RequireAuth, WhoAmI)
}
