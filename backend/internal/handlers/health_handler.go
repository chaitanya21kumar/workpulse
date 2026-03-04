package handlers

import (
	"context"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/gin-gonic/gin"
)

const version = "1.0.0"

// HealthHandler handles health and readiness checks
type HealthHandler struct {
	firestoreClient *firestore.Client
}

// NewHealthHandler creates a new HealthHandler
func NewHealthHandler(firestoreClient *firestore.Client) *HealthHandler {
	return &HealthHandler{firestoreClient: firestoreClient}
}

// Health handles GET /health — always returns 200 with version info
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]string{
			"status":  "ok",
			"version": version,
			"time":    time.Now().UTC().Format(time.RFC3339),
		},
		Message: "",
	})
}

// Ready handles GET /ready — checks Firestore connectivity
func (h *HealthHandler) Ready(c *gin.Context) {
	if h.firestoreClient != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		_, err := h.firestoreClient.Collection("_health").Doc("ping").Get(ctx)
		// A "not found" error is acceptable; it proves the connection works
		if err != nil {
			errStr := err.Error()
			isNotFound := len(errStr) > 0 &&
				(contains(errStr, "NotFound") || contains(errStr, "not found"))
			if !isNotFound {
				c.JSON(http.StatusServiceUnavailable, models.APIResponse{
					Success: false,
					Message: "firestore not ready: " + errStr,
					Code:    "NOT_READY",
				})
				return
			}
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    map[string]string{"status": "ready"},
		Message: "",
	})
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		func() bool {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}())
}
