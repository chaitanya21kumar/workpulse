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
	"github.com/chaitanya21kumar/workpulse/backend/internal/scraper"
	"go.uber.org/zap"
)

type scrapeService struct {
	ghScraper    scraper.GitHubScraper
	metricsRepo  repository.MetricsRepository
	devRepo      repository.DeveloperRepository
	mlServiceURL string
	httpClient   *http.Client
	logger       *zap.Logger
}

// NewScrapeService creates a new ScrapeService implementation
func NewScrapeService(
	ghScraper scraper.GitHubScraper,
	metricsRepo repository.MetricsRepository,
	devRepo repository.DeveloperRepository,
	mlServiceURL string,
	logger *zap.Logger,
) ScrapeService {
	return &scrapeService{
		ghScraper:    ghScraper,
		metricsRepo:  metricsRepo,
		devRepo:      devRepo,
		mlServiceURL: mlServiceURL,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
		logger:       logger,
	}
}

func (s *scrapeService) ScrapeGitHubData(ctx context.Context, username string, repos []string) error {
	s.logger.Info("Starting scrape",
		zap.String("username", username), zap.Int("repos", len(repos)))

	since := time.Now().AddDate(0, -1, 0) // Last 30 days

	totalMetrics := &models.GitHubMetrics{
		Username:  username,
		RepoName:  "aggregate",
		Period:    "monthly",
		FetchedAt: time.Now(),
	}

	for _, repo := range repos {
		commits, err := s.ghScraper.FetchUserCommits(ctx, username, repo, since)
		if err != nil {
			s.logger.Warn("Failed to fetch commits",
				zap.String("repo", repo), zap.Error(err))
			continue
		}
		totalMetrics.Commits += commits

		prStats, err := s.ghScraper.FetchPullRequests(ctx, username, repo)
		if err != nil {
			s.logger.Warn("Failed to fetch PRs",
				zap.String("repo", repo), zap.Error(err))
		} else {
			totalMetrics.PRsOpened += prStats.Opened
			totalMetrics.PRsMerged += prStats.Merged
			totalMetrics.CodeReviews += prStats.Reviews
		}

		issues, err := s.ghScraper.FetchIssues(ctx, username, repo)
		if err != nil {
			s.logger.Warn("Failed to fetch issues",
				zap.String("repo", repo), zap.Error(err))
		} else {
			totalMetrics.IssuesClosed += issues
		}
	}

	if err := s.metricsRepo.SaveMetrics(ctx, totalMetrics); err != nil {
		return fmt.Errorf("failed to save metrics: %w", err)
	}

	score, breakdown, err := s.callMLScoring(ctx, username, totalMetrics)
	if err != nil {
		s.logger.Warn("ML scoring failed, using default score", zap.Error(err))
		score = 50.0
		breakdown = map[string]float64{"default": 50.0}
	}

	dev, err := s.devRepo.GetByGitHubUsername(ctx, username)
	if err != nil || dev == nil {
		s.logger.Warn("Developer not found for score update",
			zap.String("username", username))
		return nil
	}

	dev.ContributionScore = score
	dev.TotalCommits = totalMetrics.Commits
	dev.TotalPRs = totalMetrics.PRsMerged
	dev.TotalReviews = totalMetrics.CodeReviews
	dev.TotalIssues = totalMetrics.IssuesClosed
	dev.Tier = tierFromScore(score)
	dev.LastUpdated = time.Now()

	if err := s.devRepo.Update(ctx, dev); err != nil {
		return fmt.Errorf("failed to update developer score: %w", err)
	}

	s.logger.Info("Scrape completed",
		zap.String("username", username),
		zap.Float64("score", score),
		zap.Any("breakdown", breakdown),
	)
	return nil
}

func (s *scrapeService) callMLScoring(ctx context.Context, username string, metrics *models.GitHubMetrics) (float64, map[string]float64, error) {
	// ML ScoreRequest expects flat top-level fields (not nested under "metrics")
	payload := map[string]interface{}{
		"commits":       metrics.Commits,
		"prs_merged":    metrics.PRsMerged,
		"reviews_given": metrics.CodeReviews,
		"issues_closed": metrics.IssuesClosed,
		"lines_changed": metrics.LinesAdded + metrics.LinesDeleted,
		"active_days":   0, // not yet tracked per-repo; defaults to 0
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to marshal ML request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.mlServiceURL+"/score", bytes.NewBuffer(body))
	if err != nil {
		return 0, nil, fmt.Errorf("failed to create ML request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("ML service request failed: %w", err)
	}
	defer resp.Body.Close()

	var scoreResp MLScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&scoreResp); err != nil {
		return 0, nil, fmt.Errorf("failed to decode ML response: %w", err)
	}

	return scoreResp.Score, scoreResp.Breakdown, nil
}

func tierFromScore(score float64) string {
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
