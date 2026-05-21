package mapservice

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/freegle/iznik-server-go/database"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func setupTestApp(t *testing.T) (*fiber.App, func()) {
	f, _ := os.CreateTemp("", "lat_map_test_*.db")
	dbPath := f.Name()
	f.Close()

	t.Setenv("DATABASE_TYPE", "sqlite")
	t.Setenv("SQLITE_PATH", dbPath)
	t.Setenv("LAT_BLUR_SECRET", "test-secret")

	database.InitDatabase()

	app := fiber.New()
	RegisterRoutes(app)

	return app, func() { os.Remove(dbPath) }
}

type MapPin struct {
	ID          uint64  `json:"id"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Role        string  `json:"role"`
	DisplayName string  `json:"displayName"`
	About       *string `json:"about"`
}

// TestGetPins_EmptyDB verifies that an empty database returns an empty array
func TestGetPins_EmptyDB(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var pins []MapPin
	err = json.NewDecoder(resp.Body).Decode(&pins)
	assert.NoError(t, err)
	assert.Empty(t, pins)
}

// TestGetPins_ReturnsBlurredCoordinates verifies that coordinates are blurred
func TestGetPins_ReturnsBlurredCoordinates(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	// Create a test user with exact coordinates
	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	user := database.LATUser{
		Email:       "test@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&user)

	req := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var pins []MapPin
	err = json.NewDecoder(resp.Body).Decode(&pins)
	assert.NoError(t, err)
	assert.Len(t, pins, 1)

	// Verify coordinates are blurred (different from exact location)
	assert.NotEqual(t, lat, pins[0].Lat)
	assert.NotEqual(t, lng, pins[0].Lng)

	// Verify blur is "nearby" — within 0.01 degrees (~1km)
	assert.InDelta(t, lat, pins[0].Lat, 0.01)
	assert.InDelta(t, lng, pins[0].Lng, 0.01)

	// Verify other fields are present
	assert.Equal(t, user.ID, pins[0].ID)
	assert.Equal(t, "lender", pins[0].Role)
	assert.Equal(t, "Alice", pins[0].DisplayName)
	assert.Equal(t, &about, pins[0].About)
}

// TestGetPins_BlurIsConsistent verifies that calling /pins twice returns same blurred coordinates
func TestGetPins_BlurIsConsistent(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	user := database.LATUser{
		Email:       "test@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&user)

	// First request
	req1 := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp1, err := app.Test(req1)
	assert.NoError(t, err)

	var pins1 []MapPin
	err = json.NewDecoder(resp1.Body).Decode(&pins1)
	assert.NoError(t, err)
	assert.Len(t, pins1, 1)

	// Second request
	req2 := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp2, err := app.Test(req2)
	assert.NoError(t, err)

	var pins2 []MapPin
	err = json.NewDecoder(resp2.Body).Decode(&pins2)
	assert.NoError(t, err)
	assert.Len(t, pins2, 1)

	// Verify coordinates are identical
	assert.Equal(t, pins1[0].Lat, pins2[0].Lat)
	assert.Equal(t, pins1[0].Lng, pins2[0].Lng)
}

// TestGetPins_DoesNotReturnExactLocation verifies blurred position differs from stored position
func TestGetPins_DoesNotReturnExactLocation(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	user := database.LATUser{
		Email:       "test@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&user)

	req := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)

	var pins []MapPin
	err = json.NewDecoder(resp.Body).Decode(&pins)
	assert.NoError(t, err)
	assert.Len(t, pins, 1)

	// Returned coordinates must not match exactly
	assert.NotEqual(t, lat, pins[0].Lat, "returned lat should not be exact")
	assert.NotEqual(t, lng, pins[0].Lng, "returned lng should not be exact")
}

// TestGetPins_InactiveUsersExcluded verifies inactive users are not returned
func TestGetPins_InactiveUsersExcluded(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	// Active user
	activeUser := database.LATUser{
		Email:       "active@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&activeUser)

	// Inactive user (created as active, then updated to inactive)
	inactiveUser := database.LATUser{
		Email:       "inactive@example.com",
		DisplayName: "Bob",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "tender",
		Active:      true,
	}
	database.DBConn.Create(&inactiveUser)
	// Explicitly set Active to false after creation
	database.DBConn.Model(&inactiveUser).Update("active", false)

	req := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)

	var pins []MapPin
	err = json.NewDecoder(resp.Body).Decode(&pins)
	assert.NoError(t, err)

	// Only active user should be returned
	assert.Len(t, pins, 1)
	assert.Equal(t, "Alice", pins[0].DisplayName)
}

// TestGetPins_UsersWithoutLocationExcluded verifies users without lat/lng are not returned
func TestGetPins_UsersWithoutLocationExcluded(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	// User with location
	userWithLoc := database.LATUser{
		Email:       "with@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&userWithLoc)

	// User without location (nil lat/lng)
	userWithoutLoc := database.LATUser{
		Email:       "without@example.com",
		DisplayName: "Bob",
		Lat:         nil,
		Lng:         nil,
		About:       &about,
		Role:        "tender",
		Active:      true,
	}
	database.DBConn.Create(&userWithoutLoc)

	req := httptest.NewRequest("GET", "/apiv2/lat/map/pins", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)

	var pins []MapPin
	err = json.NewDecoder(resp.Body).Decode(&pins)
	assert.NoError(t, err)

	// Only user with location should be returned
	assert.Len(t, pins, 1)
	assert.Equal(t, "Alice", pins[0].DisplayName)
}

type PublicProfile struct {
	DisplayName string  `json:"displayName"`
	Role        string  `json:"role"`
	About       *string `json:"about"`
	PhotoUrl    *string `json:"photoUrl"`
}

// TestGetPublicProfile_Found verifies public profile is returned for valid user
func TestGetPublicProfile_Found(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"
	photoUrl := "https://example.com/photo.jpg"

	user := database.LATUser{
		Email:       "test@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		PhotoURL:    &photoUrl,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&user)

	req := httptest.NewRequest("GET", fmt.Sprintf("/apiv2/lat/map/profile/%d", user.ID), nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var profile PublicProfile
	err = json.NewDecoder(resp.Body).Decode(&profile)
	assert.NoError(t, err)

	assert.Equal(t, "Alice", profile.DisplayName)
	assert.Equal(t, "lender", profile.Role)
	assert.Equal(t, &about, profile.About)
	assert.Equal(t, &photoUrl, profile.PhotoUrl)
}

// TestGetPublicProfile_NotFound verifies 404 is returned for invalid user
func TestGetPublicProfile_NotFound(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/apiv2/lat/map/profile/999999", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

// TestGetPublicProfile_InactiveUserNotFound verifies inactive users return 404
func TestGetPublicProfile_InactiveUserNotFound(t *testing.T) {
	app, cleanup := setupTestApp(t)
	defer cleanup()

	lat := 51.5074
	lng := -0.1278
	about := "Test gardener"

	user := database.LATUser{
		Email:       "test@example.com",
		DisplayName: "Alice",
		Lat:         &lat,
		Lng:         &lng,
		About:       &about,
		Role:        "lender",
		Active:      true,
	}
	database.DBConn.Create(&user)
	// Explicitly set Active to false after creation
	database.DBConn.Model(&user).Update("active", false)

	req := httptest.NewRequest("GET", fmt.Sprintf("/apiv2/lat/map/profile/%d", user.ID), nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}
