package handlers

import (
	"net/http"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/services"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ReportHandler handles HTTP requests for report operations
type ReportHandler struct {
	reportSvc services.ReportService
	logger    *zap.Logger
}

// NewReportHandler creates a new ReportHandler
func NewReportHandler(reportSvc services.ReportService, logger *zap.Logger) *ReportHandler {
	return &ReportHandler{reportSvc: reportSvc, logger: logger}
}

// GenerateReport handles POST /api/v1/reports/generate
func (h *ReportHandler) GenerateReport(c *gin.Context) {
	var req struct {
		DeveloperID string `json:"developer_id" binding:"required"`
		Period      string `json:"period" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "developer_id and period are required",
			Code:    "VALIDATION_ERROR",
		})
		return
	}

	report, err := h.reportSvc.GenerateReport(c.Request.Context(), req.DeveloperID, req.Period)
	if err != nil {
		h.logger.Error("Failed to generate report",
			zap.String("developer_id", req.DeveloperID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    report,
		Message: "report generated successfully",
	})
}

// GetReport handles GET /api/v1/reports/:developerID
func (h *ReportHandler) GetReport(c *gin.Context) {
	developerID := c.Param("developerID")
	period := c.DefaultQuery("period", "monthly")

	report, err := h.reportSvc.GetReport(c.Request.Context(), developerID, period)
	if err != nil {
		h.logger.Error("Failed to get report",
			zap.String("developer_id", developerID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: err.Error(),
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	if report == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "no report found for this developer and period",
			Code:    "NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    report,
		Message: "",
	})
}

// ListReports handles GET /api/v1/reports
func (h *ReportHandler) ListReports(c *gin.Context) {
	reports, err := h.reportSvc.ListRecentReports(c.Request.Context(), 20)
	if err != nil {
		h.logger.Error("Failed to list reports", zap.Error(err))
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "failed to list reports",
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    reports,
		Message: "",
	})
}
