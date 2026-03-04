package repository

import (
	"context"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
)

// DeveloperRepository defines the interface for developer data operations
//
//go:generate mockery --name=DeveloperRepository --output=../mocks --outpkg=mocks
type DeveloperRepository interface {
	Create(ctx context.Context, dev *models.Developer) error
	GetByID(ctx context.Context, id string) (*models.Developer, error)
	GetByGitHubUsername(ctx context.Context, username string) (*models.Developer, error)
	List(ctx context.Context, limit int) ([]*models.Developer, error)
	Update(ctx context.Context, dev *models.Developer) error
	Delete(ctx context.Context, id string) error
}

// MetricsRepository defines the interface for metrics data operations
//
//go:generate mockery --name=MetricsRepository --output=../mocks --outpkg=mocks
type MetricsRepository interface {
	SaveMetrics(ctx context.Context, metrics *models.GitHubMetrics) error
	GetMetricsByUsername(ctx context.Context, username, period string) ([]*models.GitHubMetrics, error)
	GetLeaderboard(ctx context.Context, period string, limit int) ([]*models.Developer, error)
}

// ReportRepository defines the interface for report data operations
//
//go:generate mockery --name=ReportRepository --output=../mocks --outpkg=mocks
type ReportRepository interface {
	Save(ctx context.Context, report *models.Report) error
	GetByDeveloperID(ctx context.Context, devID, period string) (*models.Report, error)
	ListRecent(ctx context.Context, limit int) ([]*models.Report, error)
}

// ScrapeJobRepository defines the interface for scrape job operations
//
//go:generate mockery --name=ScrapeJobRepository --output=../mocks --outpkg=mocks
type ScrapeJobRepository interface {
	Create(ctx context.Context, job *models.ScrapeJob) error
	GetByID(ctx context.Context, id string) (*models.ScrapeJob, error)
	UpdateStatus(ctx context.Context, id, status, errMsg string) error
	ListByUsername(ctx context.Context, username string) ([]*models.ScrapeJob, error)
}

// Ensure UpdatedAt is always set
var _ = time.Now
