package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"time"

	"github.com/freegle/iznik-server-go/database"
	"github.com/freegle/iznik-server-go/lendandtend/activity"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// RegisterRequest is the body for POST /apiv2/lat/user/register
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterResponse is the response for successful registration
type RegisterResponse struct {
	ID              uint64 `json:"id"`
	SessionID       string `json:"sessionId"`
	ProfileComplete bool   `json:"profileComplete"`
}

// Register handles POST /apiv2/lat/user/register
func Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(map[string]string{"error": "invalid request body"})
	}

	// Validate email format
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(400).JSON(map[string]string{"error": "invalid email format"})
	}

	// Validate password length (minimum 8 chars)
	if len(req.Password) < 8 {
		return c.Status(400).JSON(map[string]string{"error": "password must be at least 8 characters"})
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to hash password"})
	}

	// Check if email already exists
	var existingUser database.LATUser
	result := database.DBConn.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		// User exists
		return c.Status(409).JSON(map[string]string{"error": "email already registered"})
	} else if result.Error != gorm.ErrRecordNotFound {
		// Database error
		return c.Status(500).JSON(map[string]string{"error": "database error"})
	}

	// Create user
	now := time.Now()
	user := database.LATUser{
		Email:         req.Email,
		PasswordHash:  string(hash),
		DisplayName:   "",
		Role:          "both",
		PaymentStatus: "unpaid",
		Active:        true,
		CreatedAt:     now,
		UpdatedAt:     now,
		LastActiveAt:  now,
	}

	if err := database.DBConn.Create(&user).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to create user"})
	}

	// Notify nearby users about the new registration
	go activity.NotifyNearbyUsers(database.DBConn, user)

	// Create session
	sessionID := uuid.New().String()
	session := database.LATSession{
		ID:        sessionID,
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(30 * 24 * time.Hour), // 30-day expiry
	}

	if err := database.DBConn.Create(&session).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to create session"})
	}

	// Set session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "lat_session",
		Value:    sessionID,
		Expires:  session.ExpiresAt,
		HTTPOnly: true,
		SameSite: "Lax",
	})

	return c.Status(200).JSON(RegisterResponse{
		ID:              user.ID,
		SessionID:       sessionID,
		ProfileComplete: false,
	})
}

// LoginRequest is the body for POST /apiv2/lat/user/login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is the response for successful login
type LoginResponse struct {
	ID              uint64 `json:"id"`
	SessionID       string `json:"sessionId"`
	ProfileComplete bool   `json:"profileComplete"`
}

// Login handles POST /apiv2/lat/user/login
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(map[string]string{"error": "invalid request body"})
	}

	// Find user by email
	var user database.LATUser
	result := database.DBConn.Where("email = ?", req.Email).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		return c.Status(401).JSON(map[string]string{"error": "invalid credentials"})
	} else if result.Error != nil {
		return c.Status(500).JSON(map[string]string{"error": "database error"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(401).JSON(map[string]string{"error": "invalid credentials"})
	}

	// Create session
	sessionID := uuid.New().String()
	now := time.Now()
	session := database.LATSession{
		ID:        sessionID,
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(30 * 24 * time.Hour), // 30-day expiry
	}

	if err := database.DBConn.Create(&session).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to create session"})
	}

	// Set session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "lat_session",
		Value:    sessionID,
		Expires:  session.ExpiresAt,
		HTTPOnly: true,
		SameSite: "Lax",
	})

	// Check if profile is complete
	profileComplete := user.DisplayName != ""

	return c.Status(200).JSON(LoginResponse{
		ID:              user.ID,
		SessionID:       sessionID,
		ProfileComplete: profileComplete,
	})
}

// WhoAmIResponse is the response for GET /apiv2/lat/user/whoami
type WhoAmIResponse struct {
	ID             uint64  `json:"id"`
	Email          string  `json:"email"`
	DisplayName    string  `json:"displayName"`
	About          *string `json:"about"`
	Postcode       *string `json:"postcode"`
	Lat            *float64 `json:"lat"`
	Lng            *float64 `json:"lng"`
	TravelRadius   int     `json:"travelRadius"`
	Role           string  `json:"role"`
	PaymentStatus  string  `json:"paymentStatus"`
	Active         bool    `json:"active"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
	LastActiveAt   time.Time `json:"lastActiveAt"`
}

// WhoAmI handles GET /apiv2/lat/user/whoami
func WhoAmI(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	var user database.LATUser
	if err := database.DBConn.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(401).JSON(map[string]string{"error": "user not found"})
	}

	return c.Status(200).JSON(WhoAmIResponse{
		ID:            user.ID,
		Email:         user.Email,
		DisplayName:   user.DisplayName,
		About:         user.About,
		Postcode:      user.Postcode,
		Lat:           user.Lat,
		Lng:           user.Lng,
		TravelRadius:  user.TravelRadius,
		Role:          user.Role,
		PaymentStatus: user.PaymentStatus,
		Active:        user.Active,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
		LastActiveAt:  user.LastActiveAt,
	})
}

// CompleteProfileRequest is the body for POST /apiv2/lat/user/profile
type CompleteProfileRequest struct {
	DisplayName  string `json:"displayName"`
	Role         string `json:"role"`
	Postcode     string `json:"postcode"`
	About        string `json:"about"`
	TravelRadius int    `json:"travelRadius"`
}

// PostcodeIOResponse is the response from postcodes.io API
type PostcodeIOResponse struct {
	Status int `json:"status"`
	Result struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"result"`
}

// CompleteProfile handles POST /apiv2/lat/user/profile
func CompleteProfile(c *fiber.Ctx) error {
	userID := c.Locals("latUserId").(uint64)

	var req CompleteProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(map[string]string{"error": "invalid request body"})
	}

	// Validate displayName is not empty
	if req.DisplayName == "" {
		return c.Status(400).JSON(map[string]string{"error": "displayName is required"})
	}

	// Validate role
	if req.Role != "lender" && req.Role != "tender" && req.Role != "both" {
		return c.Status(400).JSON(map[string]string{"error": "role must be one of: lender, tender, both"})
	}

	// Validate travel radius
	if req.TravelRadius < 1 || req.TravelRadius > 50 {
		return c.Status(400).JSON(map[string]string{"error": "travelRadius must be between 1 and 50"})
	}

	// Look up postcode
	lat, lng, err := lookupPostcode(req.Postcode)
	if err != nil {
		return c.Status(400).JSON(map[string]string{"error": fmt.Sprintf("postcode lookup failed: %v", err)})
	}

	// Update user
	user := database.LATUser{}
	user.DisplayName = req.DisplayName
	user.Role = req.Role
	user.Postcode = &req.Postcode
	user.About = &req.About
	user.Lat = lat
	user.Lng = lng
	user.TravelRadius = req.TravelRadius
	user.UpdatedAt = time.Now()

	if err := database.DBConn.Model(&database.LATUser{}).Where("id = ?", userID).Updates(user).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to update profile"})
	}

	// Fetch updated user
	var updatedUser database.LATUser
	if err := database.DBConn.Where("id = ?", userID).First(&updatedUser).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to fetch updated user"})
	}

	return c.Status(200).JSON(WhoAmIResponse{
		ID:            updatedUser.ID,
		Email:         updatedUser.Email,
		DisplayName:   updatedUser.DisplayName,
		About:         updatedUser.About,
		Postcode:      updatedUser.Postcode,
		Lat:           updatedUser.Lat,
		Lng:           updatedUser.Lng,
		TravelRadius:  updatedUser.TravelRadius,
		Role:          updatedUser.Role,
		PaymentStatus: updatedUser.PaymentStatus,
		Active:        updatedUser.Active,
		CreatedAt:     updatedUser.CreatedAt,
		UpdatedAt:     updatedUser.UpdatedAt,
		LastActiveAt:  updatedUser.LastActiveAt,
	})
}

// lookupPostcode calls postcodes.io API to get lat/lng
func lookupPostcode(postcode string) (*float64, *float64, error) {
	url := fmt.Sprintf("https://api.postcodes.io/postcodes/%s", postcode)
	resp, err := http.Get(url)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, nil, fmt.Errorf("postcode API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var pcResp PostcodeIOResponse
	if err := json.Unmarshal(body, &pcResp); err != nil {
		return nil, nil, err
	}

	if pcResp.Status != 200 {
		return nil, nil, fmt.Errorf("postcode lookup failed")
	}

	return &pcResp.Result.Latitude, &pcResp.Result.Longitude, nil
}

// LogoutResponse is the response for POST /apiv2/lat/user/logout
type LogoutResponse struct {
	Ret int `json:"ret"`
}

// Logout handles POST /apiv2/lat/user/logout
func Logout(c *fiber.Ctx) error {
	sessionCookie := c.Cookies("lat_session")
	if sessionCookie == "" {
		return c.Status(401).JSON(map[string]string{"error": "no session"})
	}

	// Delete session
	if err := database.DBConn.Where("id = ?", sessionCookie).Delete(&database.LATSession{}).Error; err != nil {
		return c.Status(500).JSON(map[string]string{"error": "failed to delete session"})
	}

	// Clear cookie
	c.Cookie(&fiber.Cookie{
		Name:     "lat_session",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		SameSite: "Lax",
	})

	return c.Status(200).JSON(LogoutResponse{Ret: 0})
}
