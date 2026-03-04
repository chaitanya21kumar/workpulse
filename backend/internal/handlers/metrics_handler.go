package handlers

import (
	"net/http"
	"strconv"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// MetricsHandler handles HTTP requests for metrics operations
type MetricsHandler struct {
	devSvc services.DeveloperService
	logger *zap.Logger
}

// NewMetricsHandler creates a new MetricsHandler
func NewMetricsHandler(devSvc services.DeveloperService, logger *zap.Logger) *MetricsHandler {
	return &MetricsHandler{devSvc: devSvc, logger: logger}
}

// GetMetrics handles GET /api/v1/metrics/:username
func (h *MetricsHandler) GetMetrics(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "username is required",
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	dev, err := h.devSvc.GetDeveloper(c.Request.Context(), username)
	if err != nil {
		h.logger.Error("Failed to get metrics",
			zap.String("username", username), zap.Error(err))
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    dev,
		Message: "",
	})
}

// GetLeaderboard handles GET /api/v1/metrics/leaderboard
func (h *MetricsHandler) GetLeaderboard(c *gin.Context) {
	period := c.DefaultQuery("period", "monthly")
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	devs, err := h.devSvc.GetLeaderboard(c.Request.Context(), period, limit)
	if err != nil {
		h.logger.Error("Failed to get leaderboard", zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "failed to get leaderboard",
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    devs,
		Message: "",
	})
}
