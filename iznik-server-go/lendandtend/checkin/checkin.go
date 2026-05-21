package checkin

import (
	"strconv"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// RespondRequest is the request body for responding to a check-in
type RespondRequest struct {
	Status         string `json:"status"`          // growing | ok | not_working
	NeedsMediation bool   `json:"needsMediation"`
}

// GetPendingCheckins gets all check-ins due for the current user
// GET /apiv2/lat/checkin/pending
func GetPendingCheckins(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)
	if userId == 0 {
		return fiber.NewError(fiber.StatusUnauthorized, "Not logged in")
	}

	// 2. DB connection
	db := database.DBConn

	// 3. FETCH pending check-ins for user's agreements
	var checkins []database.LATCheckin
	db.Joins("JOIN lat_agreements ON lat_checkins.agreement_id = lat_agreements.id").
		Where("(lat_agreements.lender_id = ? OR lat_agreements.tender_id = ?) AND lat_checkins.scheduled_at <= ? AND lat_checkins.sent_at IS NULL",
			userId, userId, time.Now()).
		Order("lat_checkins.scheduled_at ASC").
		Find(&checkins)

	// 4. RESPOND
	return c.JSON(checkins)
}

// RespondToCheckin responds to a check-in
// POST /apiv2/lat/checkin/:id/respond
func RespondToCheckin(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)
	if userId == 0 {
		return fiber.NewError(fiber.StatusUnauthorized, "Not logged in")
	}

	// 2. PARSE parameters
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}

	// 3. PARSE body
	var req RespondRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	// 4. VALIDATE status
	if req.Status != "growing" && req.Status != "ok" && req.Status != "not_working" {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid status")
	}

	// 5. DB connection
	db := database.DBConn

	// 6. FETCH check-in and agreement
	var checkin database.LATCheckin
	db.First(&checkin, id)

	if checkin.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Check-in not found")
	}

	var agreement database.LATAgreement
	db.First(&agreement, checkin.AgreementID)

	if agreement.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Agreement not found")
	}

	// 7. AUTHZ - current user must be party to this agreement
	if userId != agreement.LenderID && userId != agreement.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You are not a party to this agreement")
	}

	// 8. UPDATE - set status based on user role
	now := time.Now()
	if checkin.SentAt == nil {
		checkin.SentAt = &now
	}

	if userId == agreement.LenderID {
		checkin.LenderStatus = &req.Status
	} else {
		checkin.TenderStatus = &req.Status
	}

	// Set mediation flag if "not_working"
	if req.Status == "not_working" {
		checkin.NeedsMediation = true
	} else {
		// If explicitly not "not_working", respect the request parameter
		checkin.NeedsMediation = req.NeedsMediation
	}

	result := db.Save(&checkin)
	if result.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to respond to check-in")
	}

	// 9. SIDE EFFECTS - if not_working, create admin notification
	if req.Status == "not_working" {
		createMediationNotification(db, &agreement, &checkin)
	}

	// 10. RESPOND
	return c.JSON(checkin)
}

// createMediationNotification creates a notification for admins when mediation is needed
func createMediationNotification(db *gorm.DB, agreement *database.LATAgreement, checkin *database.LATCheckin) {
	// Find admin users (assuming there's a way to identify them)
	// For now, just create a notification that could be queried by admin dashboard
	notification := database.LATNotification{
		UserID: 0, // Admin-level notification (would need admin query logic)
		Type:   "mediation_needed",
		Title:  "Garden Sharing Mediation Needed",
		Body:   "An agreement has reported issues that may need mediation",
	}
	db.Create(&notification)
}
