package payment

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all payment API routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")

	lat.Post("/payment/intent", CreatePaymentIntent)
	lat.Post("/payment/confirm", ConfirmPayment)
	lat.Post("/payment/concession", ApplyConcession)
}
