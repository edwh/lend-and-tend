package admin

import (
	"fmt"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
)

// checkAdmin verifies the user is an admin
func checkAdmin(c *fiber.Ctx) error {
	isAdmin, ok := c.Locals("isAdmin").(bool)
	if !ok || !isAdmin {
		return c.Status(403).JSON(fiber.Map{
			"error": "Forbidden",
		})
	}
	return nil
}

// ListUsers handles GET /apiv2/lat/admin/users
// Query params: ?role=lender|tender|both, ?status=unpaid|paid|concession, ?search=email_or_name
func ListUsers(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	role := c.Query("role")
	status := c.Query("status")
	search := c.Query("search")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	offset := (page - 1) * limit

	var users []database.LATUser
	query := database.DBConn

	// Filter by role
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// Filter by status
	if status != "" {
		query = query.Where("payment_status = ?", status)
	}

	// Filter by search (email or name)
	if search != "" {
		query = query.Where("email LIKE ? OR display_name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Count total
	var total int64
	query.Model(&database.LATUser{}).Count(&total)

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	return c.JSON(fiber.Map{
		"users": users,
		"total": total,
		"page":  page,
	})
}

// GetUser handles GET /apiv2/lat/admin/users/:id
func GetUser(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	id, _ := c.ParamsInt("id")

	var user database.LATUser
	if err := database.DBConn.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(user)
}

// UpdateUserRequest is the request body for updating a user
type UpdateUserRequest struct {
	IsAdmin       *bool   `json:"isAdmin"`
	Active        *bool   `json:"active"`
	PaymentStatus *string `json:"paymentStatus"`
}

// UpdateUser handles PATCH /apiv2/lat/admin/users/:id
func UpdateUser(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	id, _ := c.ParamsInt("id")

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var user database.LATUser
	if err := database.DBConn.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Update allowed fields
	updates := map[string]interface{}{}

	if req.IsAdmin != nil {
		updates["is_admin"] = *req.IsAdmin
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}
	if req.PaymentStatus != nil {
		updates["payment_status"] = *req.PaymentStatus
	}

	if err := database.DBConn.Model(&user).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}

	// Reload to get updated data
	database.DBConn.First(&user, id)

	return c.JSON(user)
}

// StartImpersonation handles POST /apiv2/lat/admin/impersonate/:userId
func StartImpersonation(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	adminId, ok := c.Locals("latUserId").(uint64)
	if !ok {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid admin ID",
		})
	}

	targetId, _ := c.ParamsInt("userId")

	// Verify target user exists
	var targetUser database.LATUser
	if err := database.DBConn.First(&targetUser, targetId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Target user not found",
		})
	}

	// Create audit record
	audit := &database.LATAdminImpersonation{
		AdminID:   adminId,
		TargetID:  uint64(targetId),
		Reason:    nil,
		CreatedAt: time.Now(),
	}

	if err := database.DBConn.Create(audit).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create impersonation record",
		})
	}

	// Set cookie to indicate impersonation
	c.Cookie(&fiber.Cookie{
		Name:     "lat_impersonating",
		Value:    fmt.Sprintf("%d", targetId),
		HTTPOnly: true,
		Secure:   true,
		SameSite: fiber.CookieSameSiteLaxMode,
		MaxAge:   86400, // 24 hours
	})

	return c.JSON(fiber.Map{
		"impersonating": targetId,
	})
}

// StopImpersonation handles DELETE /apiv2/lat/admin/impersonate
func StopImpersonation(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	// Clear the impersonation cookie
	c.Cookie(&fiber.Cookie{
		Name:     "lat_impersonating",
		Value:    "",
		HTTPOnly: true,
		Secure:   true,
		SameSite: fiber.CookieSameSiteLaxMode,
		MaxAge:   -1,
	})

	return c.JSON(fiber.Map{
		"status": "cleared",
	})
}

// MetricsResponse is the response for the metrics endpoint
type MetricsResponse struct {
	TotalUsers        int64 `json:"totalUsers"`
	Lenders           int64 `json:"lenders"`
	Tenders           int64 `json:"tenders"`
	PaidUsers         int64 `json:"paidUsers"`
	ActiveAgreements  int64 `json:"activeAgreements"`
	PendingCheckins   int64 `json:"pendingCheckins"`
}

// GetMetrics handles GET /apiv2/lat/admin/metrics
func GetMetrics(c *fiber.Ctx) error {
	if err := checkAdmin(c); err != nil {
		return err
	}

	var metrics MetricsResponse

	// Count total active users
	database.DBConn.Model(&database.LATUser{}).Where("active = ?", true).Count(&metrics.TotalUsers)

	// Count lenders (includes "both" role, active only)
	database.DBConn.Model(&database.LATUser{}).Where("active = ? AND (role = ? OR role = ?)", true, "lender", "both").Count(&metrics.Lenders)

	// Count tenders (includes "both" role, active only)
	database.DBConn.Model(&database.LATUser{}).Where("active = ? AND (role = ? OR role = ?)", true, "tender", "both").Count(&metrics.Tenders)

	// Count paid users (active only)
	database.DBConn.Model(&database.LATUser{}).Where("active = ? AND payment_status = ?", true, "paid").Count(&metrics.PaidUsers)

	// Count active agreements
	database.DBConn.Model(&database.LATAgreement{}).Where("status IN (?, ?)", "lender_agreed", "tender_agreed").Count(&metrics.ActiveAgreements)

	// Count pending checkins
	database.DBConn.Model(&database.LATCheckin{}).Where("sent_at IS NULL").Count(&metrics.PendingCheckins)

	return c.JSON(metrics)
}
