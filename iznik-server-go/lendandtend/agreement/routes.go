package agreement

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all L&T agreement routes
func RegisterRoutes(app *fiber.App) {
	lat := app.Group("/apiv2/lat")
	lat.Post("/agreement", CreateAgreement)
	lat.Get("/agreement/my", MyAgreements)
	lat.Get("/agreement/:id", GetAgreement)
	lat.Patch("/agreement/:id", UpdateAgreement)
	lat.Post("/agreement/:id/agree", AgreeToAgreement)
	lat.Get("/agreement/:id/pdf", GetAgreementPDF)
}
