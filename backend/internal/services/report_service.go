package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type reportService struct {
	reportRepo   repository.ReportRepository
	devRepo      repository.DeveloperRepository
	metricsRepo  repository.MetricsRepository
	mlServiceURL string
	httpClient   *http.Client
	logger       *zap.Logger
}

// NewReportService creates a new ReportService implementation
func NewReportService(
	reportRepo repository.ReportRepository,
	devRepo repository.DeveloperRepository,
	metricsRepo repository.MetricsRepository,
	mlServiceURL string,
	logger *zap.Logger,
) ReportService {
	return &reportService{
		reportRepo:   reportRepo,
		devRepo:      devRepo,
		metricsRepo:  metricsRepo,
		mlServiceURL: mlServiceURL,
		httpClient:   &http.Client{Timeout: 60 * time.Second},
		logger:       logger,
	}
}

func (s *reportService) GenerateReport(ctx context.Context, developerID, period string) (*models.Report, error) {
	dev, err := s.devRepo.GetByID(ctx, developerID)
	if err != nil || dev == nil {
		return nil, fmt.Errorf("developer not found: %s", developerID)
	}

	metrics, err := s.metricsRepo.GetMetricsByUsername(ctx, dev.GitHubUsername, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get metrics: %w", err)
	}

	agg := aggregateMetrics(metrics)

	insights, breakdown, err := s.callMLInsights(ctx, dev.GitHubUsername, agg, dev.ContributionScore)
	if err != nil {
		s.logger.Warn("ML insights failed, using placeholder", zap.Error(err))
		insights = &models.AIInsights{
			Summary:        "Analysis unavailable at this time.",
			Strengths:      []string{},
			Improvements:   []string{},
			ActionItems:    []string{},
			TeamImpact:     "Unknown",
			PredictedTrend: "stable",
		}
		breakdown = map[string]float64{}
	}

	report := &models.Report{
		ID:          uuid.New().String(),
		DeveloperID: developerID,
		Username:    dev.GitHubUsername,
		Period:      period,
		Score:       dev.ContributionScore,
		Tier:        dev.Tier,
		AIInsights:  insights,
		Breakdown:   breakdown,
		GeneratedAt: time.Now(),
	}

	if err := s.reportRepo.Save(ctx, report); err != nil {
		return nil, fmt.Errorf("failed to save report: %w", err)
	}

	s.logger.Info("Report generated",
		zap.String("developer_id", developerID),
		zap.String("period", period))
	return report, nil
}

func (s *reportService) GetReport(ctx context.Context, developerID, period string) (*models.Report, error) {
	report, err := s.reportRepo.GetByDeveloperID(ctx, developerID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get report: %w", err)
	}
	return report, nil
}

func (s *reportService) ListRecentReports(ctx context.Context, limit int) ([]*models.Report, error) {
	reports, err := s.reportRepo.ListRecent(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list reports: %w", err)
	}
	return reports, nil
}

func (s *reportService) callMLInsights(ctx context.Context, username string, metrics map[string]int, score float64) (*models.AIInsights, map[string]float64, error) {
	payload := map[string]interface{}{
		"developer_name": username,
		"score":          score,
		"tier":           scoreTier(score),
		"metrics": map[string]interface{}{
			"commits":       metrics["commits"],
			"prs_merged":    metrics["prs_merged"],
			"reviews_given": metrics["code_reviews"],
			"issues_closed": metrics["issues_closed"],
			"lines_changed": 0,
			"active_days":   0,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal insights request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.mlServiceURL+"/insights", bytes.NewBuffer(body))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create insights request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("ML insights request failed: %w", err)
	}
	defer resp.Body.Close()

	var insightsResp MLInsightsResponse
	if err := json.NewDecoder(resp.Body).Decode(&insightsResp); err != nil {
		return nil, nil, fmt.Errorf("failed to decode insights response: %w", err)
	}

	insights := &models.AIInsights{
		Summary:        insightsResp.Summary,
		Strengths:      insightsResp.Strengths,
		Improvements:   insightsResp.Improvements,
		ActionItems:    insightsResp.ActionItems,
		TeamImpact:     insightsResp.TeamImpact,
		PredictedTrend: insightsResp.PredictedTrend,
	}

	return insights, map[string]float64{}, nil
}

func aggregateMetrics(metrics []*models.GitHubMetrics) map[string]int {
	agg := map[string]int{
		"commits":       0,
		"prs_opened":    0,
		"prs_merged":    0,
		"code_reviews":  0,
		"issues_closed": 0,
	}
	for _, m := range metrics {
		agg["commits"] += m.Commits
		agg["prs_opened"] += m.PRsOpened
		agg["prs_merged"] += m.PRsMerged
		agg["code_reviews"] += m.CodeReviews
		agg["issues_closed"] += m.IssuesClosed
	}
	return agg
}

func scoreTier(score float64) string {
	switch {
	case score >= 85:
		return "Elite"
	case score >= 70:
		return "Senior"
	case score >= 50:
		return "Mid"
	default:
		return "Junior"
	}
}
