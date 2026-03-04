package services

import (
	"context"
	"fmt"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/repository"
	"github.com/chaitanya21kumar/workpulse/backend/internal/scraper"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type developerService struct {
	devRepo    repository.DeveloperRepository
	scrapeRepo repository.ScrapeJobRepository
	scraper    scraper.GitHubScraper
	scrapeSvc  ScrapeService
	logger     *zap.Logger
}

// NewDeveloperService creates a new DeveloperService implementation
func NewDeveloperService(
	devRepo repository.DeveloperRepository,
	scrapeRepo repository.ScrapeJobRepository,
	ghScraper scraper.GitHubScraper,
	scrapeSvc ScrapeService,
	logger *zap.Logger,
) DeveloperService {
	return &developerService{
		devRepo:    devRepo,
		scrapeRepo: scrapeRepo,
		scraper:    ghScraper,
		scrapeSvc:  scrapeSvc,
		logger:     logger,
	}
}

func (s *developerService) RegisterDeveloper(ctx context.Context, username string) (*models.Developer, error) {
	// Check if already exists
	existing, err := s.devRepo.GetByGitHubUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing developer: %w", err)
	}
	if existing != nil {
		return existing, nil
	}

	// Fetch GitHub profile
	profile, err := s.scraper.FetchUserProfile(ctx, username)
	if err != nil {
		s.logger.Warn("Failed to fetch GitHub profile, using defaults",
			zap.String("username", username), zap.Error(err))
		profile = map[string]interface{}{}
	}

	name, _ := profile["name"].(string)
	if name == "" {
		name = username
	}
	email, _ := profile["email"].(string)
	avatarURL, _ := profile["avatar_url"].(string)

	dev := &models.Developer{
		ID:             uuid.New().String(),
		GitHubUsername: username,
		Name:           name,
		Email:          email,
		AvatarURL:      avatarURL,
		CreatedAt:      time.Now(),
		LastUpdated:    time.Now(),
	}

	if err := s.devRepo.Create(ctx, dev); err != nil {
		return nil, fmt.Errorf("failed to create developer: %w", err)
	}

	// Trigger async scrape
	go func() {
		bgCtx := context.Background()
		repos, err := s.scraper.FetchUserRepos(bgCtx, username)
		if err != nil {
			s.logger.Error("Failed to fetch repos for scrape",
				zap.String("username", username), zap.Error(err))
			return
		}
		if err := s.scrapeSvc.ScrapeGitHubData(bgCtx, username, repos); err != nil {
			s.logger.Error("Background scrape failed",
				zap.String("username", username), zap.Error(err))
		}
	}()

	s.logger.Info("Developer registered",
		zap.String("username", username), zap.String("id", dev.ID))
	return dev, nil
}

func (s *developerService) GetDeveloper(ctx context.Context, username string) (*models.Developer, error) {
	dev, err := s.devRepo.GetByGitHubUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get developer: %w", err)
	}
	if dev == nil {
		return nil, fmt.Errorf("developer not found: %s", username)
	}
	return dev, nil
}

func (s *developerService) GetDashboard(ctx context.Context, username string) (*DashboardData, error) {
	dev, err := s.GetDeveloper(ctx, username)
	if err != nil {
		return nil, err
	}
	return &DashboardData{
		Developer: dev,
		Metrics:   []*models.GitHubMetrics{},
	}, nil
}

func (s *developerService) ListDevelopers(ctx context.Context, limit int) ([]*models.Developer, error) {
	devs, err := s.devRepo.List(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list developers: %w", err)
	}
	return devs, nil
}

func (s *developerService) GetLeaderboard(ctx context.Context, period string, limit int) ([]*models.Developer, error) {
	devs, err := s.devRepo.List(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get leaderboard: %w", err)
	}
	return devs, nil
}

func (s *developerService) DeleteDeveloper(ctx context.Context, username string) error {
	dev, err := s.devRepo.GetByGitHubUsername(ctx, username)
	if err != nil {
		return fmt.Errorf("failed to find developer: %w", err)
	}
	if dev == nil {
		return fmt.Errorf("developer not found: %s", username)
	}
	if err := s.devRepo.Delete(ctx, dev.ID); err != nil {
		return fmt.Errorf("failed to delete developer: %w", err)
	}
	s.logger.Info("Developer deleted", zap.String("username", username))
	return nil
}

func (s *developerService) TriggerRescrape(ctx context.Context, username string) error {
	repos, err := s.scraper.FetchUserRepos(ctx, username)
	if err != nil {
		return fmt.Errorf("failed to fetch repos: %w", err)
	}

	go func() {
		bgCtx := context.Background()
		if err := s.scrapeSvc.ScrapeGitHubData(bgCtx, username, repos); err != nil {
			s.logger.Error("Rescrape failed",
				zap.String("username", username), zap.Error(err))
		}
	}()

	s.logger.Info("Rescrape triggered", zap.String("username", username))
	return nil
}
