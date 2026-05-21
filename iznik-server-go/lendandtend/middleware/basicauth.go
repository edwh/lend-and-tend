package middleware

import (
	"encoding/base64"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// BasicAuth returns a Fiber middleware that protects routes with HTTP Basic Auth.
// Only active when BASIC_AUTH env var is set to "user:password".
// This protects the staging environment on fly.io.
//
// If BASIC_AUTH is empty or unset, middleware is a no-op (pass through).
// If BASIC_AUTH is set but credentials are invalid, returns 401 with WWW-Authenticate header.
func BasicAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		basicAuthStr := os.Getenv("BASIC_AUTH")

		// If BASIC_AUTH is empty, middleware is no-op
		if basicAuthStr == "" {
			return c.Next()
		}

		// Get Authorization header
		authHeader := c.Get("Authorization")

		// Check if header is present
		if authHeader == "" {
			c.Set("WWW-Authenticate", `Basic realm="Lend & Tend"`)
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Check if it's Basic auth
		if !strings.HasPrefix(authHeader, "Basic ") {
			c.Set("WWW-Authenticate", `Basic realm="Lend & Tend"`)
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Decode the credentials
		credentials := strings.TrimPrefix(authHeader, "Basic ")
		decoded, err := base64.StdEncoding.DecodeString(credentials)
		if err != nil {
			c.Set("WWW-Authenticate", `Basic realm="Lend & Tend"`)
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Compare with expected credentials
		if string(decoded) != basicAuthStr {
			c.Set("WWW-Authenticate", `Basic realm="Lend & Tend"`)
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Credentials match, proceed
		return c.Next()
	}
}
