package services

import (
	"context"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
)

// DeveloperService defines business logic for developer operations
//
//go:generate mockery --name=DeveloperService --output=../mocks --outpkg=mocks
type DeveloperService interface {
	RegisterDeveloper(ctx context.Context, username string) (*models.Developer, error)
	GetDeveloper(ctx context.Context, username string) (*models.Developer, error)
	GetDashboard(ctx context.Context, username string) (*DashboardData, error)
	ListDevelopers(ctx context.Context, limit int) ([]*models.Developer, error)
	GetLeaderboard(ctx context.Context, period string, limit int) ([]*models.Developer, error)
	DeleteDeveloper(ctx context.Context, username string) error
	TriggerRescrape(ctx context.Context, username string) error
}

// ScrapeService defines business logic for GitHub data scraping
//
//go:generate mockery --name=ScrapeService --output=../mocks --outpkg=mocks
type ScrapeService interface {
	ScrapeGitHubData(ctx context.Context, username string, repos []string) error
}

// ReportService defines business logic for AI report generation
//
//go:generate mockery --name=ReportService --output=../mocks --outpkg=mocks
type ReportService interface {
	GenerateReport(ctx context.Context, developerID, period string) (*models.Report, error)
	GetReport(ctx context.Context, developerID, period string) (*models.Report, error)
	ListRecentReports(ctx context.Context, limit int) ([]*models.Report, error)
}

// DashboardData holds aggregated data for the developer dashboard
type DashboardData struct {
	Developer *models.Developer       `json:"developer"`
	Metrics   []*models.GitHubMetrics `json:"metrics"`
	Report    *models.Report          `json:"report,omitempty"`
}

// MLScoreResponse is the response from the ML service scoring endpoint
type MLScoreResponse struct {
	Username   string             `json:"username"`
	Score      float64            `json:"score"`
	Tier       string             `json:"tier"`
	Breakdown  map[string]float64 `json:"breakdown"`
	Percentile float64            `json:"percentile"`
}

// MLInsightsResponse is the response from the ML service insights endpoint
type MLInsightsResponse struct {
	Summary        string   `json:"summary"`
	Strengths      []string `json:"strengths"`
	Improvements   []string `json:"improvements"`
	ActionItems    []string `json:"action_items"`
	TeamImpact     string   `json:"team_impact"`
	PredictedTrend string   `json:"predicted_trend"`
}
