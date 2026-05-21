package admin

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all admin API routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")

	lat.Get("/admin/users", ListUsers)
	lat.Get("/admin/users/:id", GetUser)
	lat.Patch("/admin/users/:id", UpdateUser)
	lat.Post("/admin/impersonate/:userId", StartImpersonation)
	lat.Delete("/admin/impersonate", StopImpersonation)
	lat.Get("/admin/metrics", GetMetrics)
	lat.Get("/admin/agreements", ListAgreements)
}
