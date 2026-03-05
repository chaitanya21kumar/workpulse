package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// githubUsernameRe validates GitHub username rules:
// 1-39 chars, alphanumeric or hyphens, not starting/ending with hyphen.
var githubUsernameRe = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`)

// validateGitHubUsername returns an error message if the username is invalid, else "".
func validateGitHubUsername(username string) string {
	username = strings.TrimSpace(username)
	if username == "" {
		return "username is required"
	}
	if len(username) > 39 {
		return "username must be 39 characters or fewer"
	}
	if strings.Contains(username, "--") {
		return "username cannot contain consecutive hyphens"
	}
	if !githubUsernameRe.MatchString(username) {
		return "username must contain only alphanumeric characters or hyphens and cannot start or end with a hyphen"
	}
	return ""
}

// DeveloperHandler handles HTTP requests for developer operations
type DeveloperHandler struct {
	svc    services.DeveloperService
	logger *zap.Logger
}

// NewDeveloperHandler creates a new DeveloperHandler
func NewDeveloperHandler(svc services.DeveloperService, logger *zap.Logger) *DeveloperHandler {
	return &DeveloperHandler{svc: svc, logger: logger}
}

// RegisterDeveloper handles POST /api/v1/developers
func (h *DeveloperHandler) RegisterDeveloper(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "username is required",
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	if msg := validateGitHubUsername(req.Username); msg != "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: msg,
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	dev, err := h.svc.RegisterDeveloper(c.Request.Context(), req.Username)
	if err != nil {
		h.logger.Error("Failed to register developer",
			zap.String("username", req.Username), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    dev,
		Message: "developer registered successfully",
	})
}

// ListDevelopers handles GET /api/v1/developers
func (h *DeveloperHandler) ListDevelopers(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	devs, err := h.svc.ListDevelopers(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("Failed to list developers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "failed to list developers",
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

// GetDeveloper handles GET /api/v1/developers/:username
func (h *DeveloperHandler) GetDeveloper(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "username is required",
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	dashboard, err := h.svc.GetDashboard(c.Request.Context(), username)
	if err != nil {
		h.logger.Error("Failed to get developer",
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
		Data:    dashboard,
		Message: "",
	})
}

// DeleteDeveloper handles DELETE /api/v1/developers/:username
func (h *DeveloperHandler) DeleteDeveloper(c *gin.Context) {
	username := c.Param("username")
	if err := h.svc.DeleteDeveloper(c.Request.Context(), username); err != nil {
		h.logger.Error("Failed to delete developer",
			zap.String("username", username), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    nil,
		Message: "developer deleted successfully",
	})
}

// TriggerScrape handles POST /api/v1/developers/:username/scrape
func (h *DeveloperHandler) TriggerScrape(c *gin.Context) {
	username := strings.TrimSpace(c.Param("username"))
	if msg := validateGitHubUsername(username); msg != "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: msg,
			Code:    "VALIDATION_ERROR",
		})
		return
	}
	if err := h.svc.TriggerRescrape(c.Request.Context(), username); err != nil {
		h.logger.Error("Failed to trigger scrape",
			zap.String("username", username), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusAccepted, models.APIResponse{
		Success: true,
		Data:    nil,
		Message: "scrape job triggered",
	})
}

// GenerateInsights handles POST /api/v1/developers/:username/insights
func (h *DeveloperHandler) GenerateInsights(c *gin.Context) {
	username := strings.TrimSpace(c.Param("username"))
	if msg := validateGitHubUsername(username); msg != "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: msg,
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	insights, err := h.svc.GenerateInsights(c.Request.Context(), username)
	if err != nil {
		h.logger.Error("Failed to generate insights",
			zap.String("username", username), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    insights,
		Message: "insights generated successfully",
	})
}
