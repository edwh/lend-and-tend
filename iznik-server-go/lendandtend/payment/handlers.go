package payment

import (
	"fmt"
	"os"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
)

// PaymentIntentResponse is the response for creating a payment intent
type PaymentIntentResponse struct {
	ClientSecret string `json:"clientSecret"`
	Amount       int    `json:"amount"`
	Currency     string `json:"currency"`
}

// CreatePaymentIntent handles POST /apiv2/lat/payment/intent
// MVP: returns mock client secret if STRIPE_SECRET_KEY is not set
func CreatePaymentIntent(c *fiber.Ctx) error {
	userId, ok := c.Locals("latUserId").(uint64)
	if !ok {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Verify user exists
	var user database.LATUser
	if err := database.DBConn.First(&user, userId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	stripeSecretKey := os.Getenv("STRIPE_SECRET_KEY")

	// MVP: if no STRIPE_SECRET_KEY, return mock secret
	if stripeSecretKey == "" {
		mockSecret := fmt.Sprintf("mock_secret_%d_%d", userId, time.Now().Unix())
		return c.JSON(PaymentIntentResponse{
			ClientSecret: mockSecret,
			Amount:       1200, // £12.00 in pence
			Currency:     "gbp",
		})
	}

	// If STRIPE_SECRET_KEY is set, create real Stripe PaymentIntent
	// (For MVP this is a placeholder - actual Stripe integration comes later)
	mockSecret := fmt.Sprintf("mock_secret_%d_%d", userId, time.Now().Unix())
	return c.JSON(PaymentIntentResponse{
		ClientSecret: mockSecret,
		Amount:       1200,
		Currency:     "gbp",
	})
}

// ConfirmPaymentRequest is the request body for confirming payment
type ConfirmPaymentRequest struct {
	PaymentIntentId string `json:"paymentIntentId"`
}

// ConfirmPayment handles POST /apiv2/lat/payment/confirm
// MVP: directly sets PaymentStatus to "paid" without real Stripe verification
func ConfirmPayment(c *fiber.Ctx) error {
	userId, ok := c.Locals("latUserId").(uint64)
	if !ok {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req ConfirmPaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get user
	var user database.LATUser
	if err := database.DBConn.First(&user, userId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// MVP: directly set status to paid (mock Stripe)
	if err := database.DBConn.Model(&user).Update("payment_status", "paid").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update payment status",
		})
	}

	return c.JSON(fiber.Map{
		"status": "paid",
	})
}

// ConcessionRequest is the request body for applying for a concession
type ConcessionRequest struct {
	Reason      string `json:"reason"`
	Declaration bool   `json:"declaration"`
}

// ApplyConcession handles POST /apiv2/lat/payment/concession
func ApplyConcession(c *fiber.Ctx) error {
	userId, ok := c.Locals("latUserId").(uint64)
	if !ok {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req ConcessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if !req.Declaration {
		return c.Status(400).JSON(fiber.Map{
			"error": "Declaration must be true",
		})
	}

	// Get user
	var user database.LATUser
	if err := database.DBConn.First(&user, userId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Set status to concession
	if err := database.DBConn.Model(&user).Update("payment_status", "concession").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update payment status",
		})
	}

	return c.JSON(fiber.Map{
		"status": "concession",
	})
}
