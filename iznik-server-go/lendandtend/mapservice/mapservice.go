package mapservice

import (
	"crypto/hmac"
	"crypto/sha256"
	"math"
	"os"
	"strconv"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
)

type PinResponse struct {
	ID          uint64  `json:"id"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Role        string  `json:"role"`
	DisplayName string  `json:"displayName"`
	About       *string `json:"about"`
}

type ProfileResponse struct {
	DisplayName string  `json:"displayName"`
	Role        string  `json:"role"`
	About       *string `json:"about"`
	PhotoUrl    *string `json:"photoUrl"`
}

// getBlurSecret returns the HMAC secret for blur operations, defaulting to "dev-secret"
func getBlurSecret() string {
	secret := os.Getenv("LAT_BLUR_SECRET")
	if secret == "" {
		secret = "dev-secret"
	}
	return secret
}

// computeBlurOffset generates a deterministic but unpredictable offset for a user ID
// Returns offset in degrees for both lat and lng (approximately 400m max)
func computeBlurOffset(userID uint64) (latOffset, lngOffset float64) {
	secret := getBlurSecret()

	// Create HMAC-SHA256 of the user ID
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(strconv.FormatUint(userID, 10)))
	hash := h.Sum(nil)

	// Use first 8 bytes for lat, next 8 bytes for lng
	latBytes := hash[0:8]
	lngBytes := hash[8:16]

	// Convert bytes to float between 0 and 1
	latHashFloat := float64(bytesToUint64(latBytes)) / math.MaxUint64
	lngHashFloat := float64(bytesToUint64(lngBytes)) / math.MaxUint64

	// Convert 400m to degrees
	// 1 degree latitude ≈ 111 km
	// 1 degree longitude ≈ 111 km * cos(latitude), but we'll use a simpler approximation
	// 400m = 0.4 km
	// lat: 0.4 / 111 ≈ 0.0036 degrees
	// lng: 0.4 / 88 ≈ 0.0045 degrees (at ~50°N latitude)
	maxLatOffsetDegrees := 0.0036
	maxLngOffsetDegrees := 0.0045

	// Apply hash to get offset within bounds
	// Range from -max to +max
	latOffset = (latHashFloat*2 - 1) * maxLatOffsetDegrees
	lngOffset = (lngHashFloat*2 - 1) * maxLngOffsetDegrees

	return latOffset, lngOffset
}

// bytesToUint64 converts 8 bytes to uint64 (big-endian)
func bytesToUint64(b []byte) uint64 {
	var result uint64
	for i := 0; i < 8 && i < len(b); i++ {
		result = result*256 + uint64(b[i])
	}
	return result
}

// GetPins returns blurred pin locations for map display
// GET /apiv2/lat/map/pins
func GetPins(c *fiber.Ctx) error {
	var users []database.LATUser

	// Query all active users with location data
	result := database.DBConn.Where("active = ? AND lat IS NOT NULL AND lng IS NOT NULL", true).Find(&users)

	if result.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to fetch users")
	}

	pins := make([]PinResponse, 0, len(users))

	for _, user := range users {
		if user.Lat == nil || user.Lng == nil {
			continue // Skip users without location
		}

		latOffset, lngOffset := computeBlurOffset(user.ID)
		blurredLat := *user.Lat + latOffset
		blurredLng := *user.Lng + lngOffset

		pin := PinResponse{
			ID:          user.ID,
			Lat:         blurredLat,
			Lng:         blurredLng,
			Role:        user.Role,
			DisplayName: user.DisplayName,
			About:       user.About,
		}

		pins = append(pins, pin)
	}

	return c.JSON(pins)
}

// GetPublicProfile returns public profile for a user
// GET /apiv2/lat/map/profile/:userId
func GetPublicProfile(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")

	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid user ID")
	}

	var user database.LATUser
	result := database.DBConn.Where("id = ? AND active = ?", userID, true).First(&user)

	if result.Error != nil {
		return fiber.NewError(fiber.StatusNotFound, "User not found")
	}

	profile := ProfileResponse{
		DisplayName: user.DisplayName,
		Role:        user.Role,
		About:       user.About,
		PhotoUrl:    user.PhotoURL,
	}

	return c.JSON(profile)
}
