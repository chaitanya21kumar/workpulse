package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"github.com/chaitanya21kumar/workpulse/backend/internal/repository"
	"github.com/chaitanya21kumar/workpulse/backend/internal/scraper"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type developerService struct {
	devRepo     repository.DeveloperRepository
	scrapeRepo  repository.ScrapeJobRepository
	scraper     scraper.GitHubScraper
	scrapeSvc   ScrapeService
	groqAPIKey  string
	logger      *zap.Logger
}

// NewDeveloperService creates a new DeveloperService implementation
func NewDeveloperService(
	devRepo repository.DeveloperRepository,
	scrapeRepo repository.ScrapeJobRepository,
	ghScraper scraper.GitHubScraper,
	scrapeSvc ScrapeService,
	groqAPIKey string,
	logger *zap.Logger,
) DeveloperService {
	return &developerService{
		devRepo:    devRepo,
		scrapeRepo: scrapeRepo,
		scraper:    ghScraper,
		scrapeSvc:  scrapeSvc,
		groqAPIKey: groqAPIKey,
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

// GenerateInsights generates AI insights for a developer by calling Groq directly.
func (s *developerService) GenerateInsights(ctx context.Context, username string) (*models.AIInsights, error) {
	if s.groqAPIKey == "" {
		return nil, fmt.Errorf("GROQ_API_KEY is not configured on the server")
	}

	dev, err := s.GetDeveloper(ctx, username)
	if err != nil {
		return nil, err
	}

	insights, err := generateInsightsFromGroq(ctx, s.groqAPIKey, dev)
	if err != nil {
		s.logger.Error("Groq insights generation failed",
			zap.String("username", username), zap.Error(err))
		return nil, fmt.Errorf("failed to generate insights: %w", err)
	}

	s.logger.Info("Insights generated via Groq", zap.String("username", username))
	return insights, nil
}

// generateInsightsFromGroq calls the Groq API and returns structured AIInsights.
func generateInsightsFromGroq(ctx context.Context, groqAPIKey string, dev *models.Developer) (*models.AIInsights, error) {
	prompt := fmt.Sprintf(`Analyze this developer's GitHub stats and provide structured insights.
Developer: %s
Commits: %d
PRs Merged: %d
Code Reviews: %d
Issues Closed: %d
Score: %.1f/100
Tier: %s

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "summary": "2-3 sentence performance overview",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "action_items": ["specific action 1", "specific action 2"],
  "team_impact": "1 sentence about team impact",
  "predicted_trend": "improving"
}
The predicted_trend must be one of: "improving", "stable", "declining"`,
		dev.GitHubUsername, dev.TotalCommits, dev.TotalPRs, dev.TotalReviews,
		dev.TotalIssues, dev.ContributionScore, dev.Tier)

	reqBody := map[string]interface{}{
		"model": "llama-3.3-70b-versatile",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"max_tokens":  600,
		"temperature": 0.7,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal groq request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions",
		bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to build groq request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+groqAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("groq API call failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		if errBody.Error.Message != "" {
			return nil, fmt.Errorf("groq API error (status %d): %s", resp.StatusCode, errBody.Error.Message)
		}
		return nil, fmt.Errorf("groq API returned status %d", resp.StatusCode)
	}

	var groqResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return nil, fmt.Errorf("failed to decode groq response: %w", err)
	}
	if len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("empty groq response")
	}

	content := strings.TrimSpace(groqResp.Choices[0].Message.Content)
	// Strip markdown code fences if present
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			content = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}

	var insights models.AIInsights
	if err := json.Unmarshal([]byte(content), &insights); err != nil {
		return nil, fmt.Errorf("failed to parse insights JSON from groq: %w", err)
	}
	return &insights, nil
}
