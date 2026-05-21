package agreement

import (
	"bytes"
	"fmt"
	"strconv"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/go-pdf/fpdf"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CreateRequest is the request body for creating an agreement
type CreateRequest struct {
	LenderID uint64 `json:"lenderId"`
	TenderID uint64 `json:"tenderId"`
}

// UpdateRequest is the request body for updating an agreement
type UpdateRequest struct {
	GardenAddress      *string    `json:"gardenAddress"`
	GardeningHours     *string    `json:"gardeningHours"`
	GrowingPurpose     *string    `json:"growingPurpose"`
	MaxPeople          *int       `json:"maxPeople"`
	ExchangeTerms      *string    `json:"exchangeTerms"`
	EndDate            *time.Time `json:"endDate"`
	NoticePeriodMonths *int       `json:"noticePeriodMonths"`
	AllowAnimals       *bool      `json:"allowAnimals"`
	AllowCommercial    *bool      `json:"allowCommercial"`
	AdditionalTerms    *string    `json:"additionalTerms"`
}

// AgreeRequest is the request body for agreeing to an agreement
type AgreeRequest struct{}

// CheckinRequest is the request body for responding to a check-in
type CheckinRequest struct {
	Status          string `json:"status"` // growing | ok | not_working
	NeedsMediation  bool   `json:"needsMediation"`
}

// CreateAgreement creates a new draft agreement
// POST /apiv2/lat/agreement
func CreateAgreement(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)
	if userId == 0 {
		return fiber.NewError(fiber.StatusUnauthorized, "Not logged in")
	}

	// 2. PARSE body
	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	// 3. AUTHZ - requester must be either lender or tender
	if userId != req.LenderID && userId != req.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You can only create an agreement as the lender or tender")
	}

	// 4. DB write
	db := database.DBConn
	agreement := database.LATAgreement{
		LenderID: req.LenderID,
		TenderID: req.TenderID,
		Status:   "draft",
	}

	result := db.Create(&agreement)
	if result.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to create agreement")
	}

	// 7. RESPOND
	return c.JSON(agreement)
}

// GetAgreement gets a single agreement
// GET /apiv2/lat/agreement/:id
func GetAgreement(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)

	// 2. PARSE parameters
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}

	// 3. DB connection
	db := database.DBConn

	// 4. FETCH
	var agreement database.LATAgreement
	db.First(&agreement, id)

	if agreement.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Agreement not found")
	}

	// 5. PRIVACY - only lender or tender can view
	if userId != agreement.LenderID && userId != agreement.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You cannot view this agreement")
	}

	// 7. RESPOND
	return c.JSON(agreement)
}

// UpdateAgreement updates an agreement's draft fields
// PATCH /apiv2/lat/agreement/:id
func UpdateAgreement(c *fiber.Ctx) error {
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
	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	// 4. DB connection
	db := database.DBConn

	// 5. FETCH
	var agreement database.LATAgreement
	db.First(&agreement, id)

	if agreement.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Agreement not found")
	}

	// 6. AUTHZ - either party can edit in draft or one-sided agreed
	if userId != agreement.LenderID && userId != agreement.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You cannot edit this agreement")
	}

	// 7. VALIDATE - can only update in draft or one-sided agreed status
	if agreement.Status != "draft" && agreement.Status != "lender_agreed" && agreement.Status != "tender_agreed" {
		return fiber.NewError(fiber.StatusBadRequest, "Agreement cannot be edited in this status")
	}

	// 8. UPDATE - apply non-nil fields
	if req.GardenAddress != nil {
		agreement.GardenAddress = req.GardenAddress
	}
	if req.GardeningHours != nil {
		agreement.GardeningHours = req.GardeningHours
	}
	if req.GrowingPurpose != nil {
		agreement.GrowingPurpose = req.GrowingPurpose
	}
	if req.MaxPeople != nil {
		agreement.MaxPeople = req.MaxPeople
	}
	if req.ExchangeTerms != nil {
		agreement.ExchangeTerms = req.ExchangeTerms
	}
	if req.EndDate != nil {
		agreement.EndDate = req.EndDate
	}
	if req.NoticePeriodMonths != nil {
		agreement.NoticePeriodMonths = *req.NoticePeriodMonths
	}
	if req.AllowAnimals != nil {
		agreement.AllowAnimals = *req.AllowAnimals
	}
	if req.AllowCommercial != nil {
		agreement.AllowCommercial = *req.AllowCommercial
	}
	if req.AdditionalTerms != nil {
		agreement.AdditionalTerms = req.AdditionalTerms
	}

	result := db.Save(&agreement)
	if result.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to update agreement")
	}

	// 9. RESPOND
	return c.JSON(agreement)
}

// AgreeToAgreement marks the current user as agreeing to the agreement
// POST /apiv2/lat/agreement/:id/agree
func AgreeToAgreement(c *fiber.Ctx) error {
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

	// 3. DB connection
	db := database.DBConn

	// 4. FETCH
	var agreement database.LATAgreement
	db.First(&agreement, id)

	if agreement.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Agreement not found")
	}

	// 5. AUTHZ - current user must be party to this agreement
	if userId != agreement.LenderID && userId != agreement.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You are not a party to this agreement")
	}

	// 6. UPDATE - set agreement time and status
	now := time.Now()

	if userId == agreement.LenderID {
		agreement.LenderAgreedAt = &now
		if agreement.Status == "draft" {
			agreement.Status = "lender_agreed"
		} else if agreement.Status == "tender_agreed" {
			agreement.Status = "complete"
		}
	} else {
		agreement.TenderAgreedAt = &now
		if agreement.Status == "draft" {
			agreement.Status = "tender_agreed"
		} else if agreement.Status == "lender_agreed" {
			agreement.Status = "complete"
		}
	}

	result := db.Save(&agreement)
	if result.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to agree to agreement")
	}

	// 7. SIDE EFFECTS - if both have agreed, create check-ins
	if agreement.Status == "complete" {
		createCheckinsForAgreement(db, &agreement)
	}

	// 8. RESPOND
	return c.JSON(agreement)
}

// GetAgreementPDF generates a PDF of the agreement
// GET /apiv2/lat/agreement/:id/pdf
func GetAgreementPDF(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)

	// 2. PARSE parameters
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid ID")
	}

	// 3. DB connection
	db := database.DBConn

	// 4. FETCH
	var agreement database.LATAgreement
	db.First(&agreement, id)

	if agreement.ID == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Agreement not found")
	}

	// 5. PRIVACY - only lender or tender can view
	if userId != agreement.LenderID && userId != agreement.TenderID {
		return fiber.NewError(fiber.StatusForbidden, "You cannot view this agreement")
	}

	// 6. FETCH user details
	var lender, tender database.LATUser
	db.First(&lender, agreement.LenderID)
	db.First(&tender, agreement.TenderID)

	// 7. GENERATE PDF
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, "Lend & Tend Garden Sharing Agreement", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 11)
	pdf.Ln(10)

	// Parties
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(0, 10, "Parties", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 8, fmt.Sprintf("Lender: %s", lender.DisplayName), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Tender: %s", tender.DisplayName), "", 1, "L", false, 0, "")

	// Agreement Details
	pdf.SetFont("Arial", "B", 12)
	pdf.Ln(5)
	pdf.CellFormat(0, 10, "Agreement Details", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)

	if agreement.GardenAddress != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Garden Address: %s", *agreement.GardenAddress), "", 1, "L", false, 0, "")
	}
	if agreement.GardeningHours != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Gardening Hours: %s", *agreement.GardeningHours), "", 1, "L", false, 0, "")
	}
	if agreement.GrowingPurpose != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Growing Purpose: %s", *agreement.GrowingPurpose), "", 1, "L", false, 0, "")
	}
	if agreement.MaxPeople != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Max People: %d", *agreement.MaxPeople), "", 1, "L", false, 0, "")
	}
	if agreement.ExchangeTerms != nil {
		pdf.MultiCell(0, 8, fmt.Sprintf("Exchange Terms: %s", *agreement.ExchangeTerms), "", "L", false)
	}

	// Permissions
	pdf.SetFont("Arial", "B", 12)
	pdf.Ln(5)
	pdf.CellFormat(0, 10, "Permissions", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 8, fmt.Sprintf("Allow Animals: %v", agreement.AllowAnimals), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Allow Commercial: %v", agreement.AllowCommercial), "", 1, "L", false, 0, "")

	// Signatures
	pdf.SetFont("Arial", "B", 12)
	pdf.Ln(10)
	pdf.CellFormat(0, 10, "Signatures", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)

	if agreement.LenderAgreedAt != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Lender agreed: %s", agreement.LenderAgreedAt.Format("2006-01-02 15:04:05")), "", 1, "L", false, 0, "")
	} else {
		pdf.CellFormat(0, 8, "Lender agreed: Not yet", "", 1, "L", false, 0, "")
	}

	if agreement.TenderAgreedAt != nil {
		pdf.CellFormat(0, 8, fmt.Sprintf("Tender agreed: %s", agreement.TenderAgreedAt.Format("2006-01-02 15:04:05")), "", 1, "L", false, 0, "")
	} else {
		pdf.CellFormat(0, 8, "Tender agreed: Not yet", "", 1, "L", false, 0, "")
	}

	// 8. RESPOND
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=agreement_%d.pdf", agreement.ID))

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to generate PDF")
	}

	return c.Send(buf.Bytes())
}

// MyAgreements lists all agreements for the current user
// GET /apiv2/lat/agreement/my
func MyAgreements(c *fiber.Ctx) error {
	// 1. AUTH
	userId := c.Locals("latUserId").(uint64)
	if userId == 0 {
		return fiber.NewError(fiber.StatusUnauthorized, "Not logged in")
	}

	// 2. DB connection
	db := database.DBConn

	// 3. FETCH
	var agreements []database.LATAgreement
	db.Where("lender_id = ? OR tender_id = ?", userId, userId).
		Order("created_at DESC").
		Find(&agreements)

	// 4. RESPOND
	return c.JSON(agreements)
}

// createCheckinsForAgreement creates check-in records at 14, 30, 90, 180 days
func createCheckinsForAgreement(db *gorm.DB, agreement *database.LATAgreement) {
	now := time.Now()
	days := []int{14, 30, 90, 180}

	for _, d := range days {
		scheduledAt := now.AddDate(0, 0, d)
		checkin := database.LATCheckin{
			AgreementID: agreement.ID,
			ScheduledAt: scheduledAt,
		}
		db.Create(&checkin)

		// Create notifications for both parties
		lenderNotif := database.LATNotification{
			UserID: agreement.LenderID,
			Type:   "checkin",
			Title:  "Garden Check-in Scheduled",
			Body:   fmt.Sprintf("Your garden sharing check-in is coming up on %s", scheduledAt.Format("2006-01-02")),
			Link:   nil,
		}
		db.Create(&lenderNotif)

		tenderNotif := database.LATNotification{
			UserID: agreement.TenderID,
			Type:   "checkin",
			Title:  "Garden Check-in Scheduled",
			Body:   fmt.Sprintf("Your garden sharing check-in is coming up on %s", scheduledAt.Format("2006-01-02")),
			Link:   nil,
		}
		db.Create(&tenderNotif)
	}
}
