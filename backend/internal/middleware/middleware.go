package middleware

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// FirebaseAuth verifies Firebase ID tokens in the Authorization header
func FirebaseAuth(app *firebase.App) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "missing authorization header",
				Code:    "UNAUTHORIZED",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "invalid authorization format — use 'Bearer <token>'",
				Code:    "UNAUTHORIZED",
			})
			c.Abort()
			return
		}

		client, err := app.Auth(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Message: "auth service unavailable",
				Code:    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		token, err := client.VerifyIDToken(context.Background(), parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "invalid or expired token",
				Code:    "UNAUTHORIZED",
			})
			c.Abort()
			return
		}

		c.Set("uid", token.UID)
		c.Set("token", token)
		c.Next()
	}
}

// GetTokenFromContext retrieves the Firebase token from gin context
func GetTokenFromContext(c *gin.Context) *auth.Token {
	val, exists := c.Get("token")
	if !exists {
		return nil
	}
	token, ok := val.(*auth.Token)
	if !ok {
		return nil
	}
	return token
}

// CORS middleware allows cross-origin requests from the frontend
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// RequestLogger logs each HTTP request with structured fields
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		if query != "" {
			path = path + "?" + query
		}

		logger.Info("HTTP request",
			zap.Int("status", c.Writer.Status()),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}

// rateLimiter implements a simple token bucket per IP
type rateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     int
	capacity int
}

type bucket struct {
	tokens    int
	lastRefil time.Time
}

// RateLimit limits requests to `rate` per minute per IP
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	rl := &rateLimiter{
		buckets:  make(map[string]*bucket),
		rate:     requestsPerMinute,
		capacity: requestsPerMinute,
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.allow(ip) {
			c.JSON(http.StatusTooManyRequests, models.APIResponse{
				Success: false,
				Message: "rate limit exceeded — please slow down",
				Code:    "RATE_LIMITED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, ok := rl.buckets[ip]
	if !ok {
		rl.buckets[ip] = &bucket{tokens: rl.capacity - 1, lastRefil: time.Now()}
		return true
	}

	elapsed := time.Since(b.lastRefil)
	refill := int(elapsed.Minutes() * float64(rl.rate))
	if refill > 0 {
		b.tokens = minInt(rl.capacity, b.tokens+refill)
		b.lastRefil = time.Now()
	}

	if b.tokens <= 0 {
		return false
	}
	b.tokens--
	return true
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Recovery catches panics and returns 500
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return gin.RecoveryWithWriter(nil, func(c *gin.Context, err interface{}) {
		logger.Error("Panic recovered", zap.Any("error", err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "internal server error",
			Code:    "INTERNAL_ERROR",
		})
	})
}
