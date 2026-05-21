// Package router provides routing for the Lend & Tend API
//
// @title Lend & Tend API
// @version 1.0
// @description The Lend & Tend API provides access to garden-sharing functionality.  See README.md for more info.
// @termsOfService https://lendandtend.com/terms
//
// @contact.name Lend & Tend Support
// @contact.url https://lendandtend.com/help
// @contact.email support@lendandtend.com
//
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT
//
// @host api.lendandtend.com
// @BasePath /apiv2
// @query.collection.format multi
//
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
package router

import (
	"github.com/freegle/iznik-server-go/lendandtend/activity"
	"github.com/freegle/iznik-server-go/lendandtend/admin"
	"github.com/freegle/iznik-server-go/lendandtend/agreement"
	"github.com/freegle/iznik-server-go/lendandtend/auth"
	"github.com/freegle/iznik-server-go/lendandtend/checkin"
	"github.com/freegle/iznik-server-go/lendandtend/health"
	"github.com/freegle/iznik-server-go/lendandtend/mapservice"
	"github.com/freegle/iznik-server-go/lendandtend/messaging"
	"github.com/freegle/iznik-server-go/lendandtend/payment"
	"github.com/gofiber/fiber/v2"
)

// SetupRoutes registers all Lend & Tend API routes
// @Summary Setup Lend & Tend API routes
// @Description Configures /apiv2 route group with all L&T endpoints
func SetupRoutes(app *fiber.App) {
	// Register routes from all L&T packages
	activity.RegisterRoutes(app)
	auth.RegisterRoutes(app)
	agreement.RegisterRoutes(app)
	checkin.RegisterRoutes(app)
	health.RegisterRoutes(app)
	mapservice.RegisterRoutes(app)
	messaging.RegisterRoutes(app)
	payment.RegisterRoutes(app)
	admin.RegisterRoutes(app)
}
