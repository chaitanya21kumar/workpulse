package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"go.uber.org/zap"
)

const githubAPIBase = "https://api.github.com"

type githubScraper struct {
	token      string
	httpClient *http.Client
	logger     *zap.Logger
}

// NewGitHubScraper creates a new GitHub scraper using the provided token
func NewGitHubScraper(token string, logger *zap.Logger) GitHubScraper {
	return &githubScraper{
		token: token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

func (s *githubScraper) doRequest(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "WorkPulse/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check rate limit
	remaining := resp.Header.Get("X-RateLimit-Remaining")
	if remaining != "" {
		rem, _ := strconv.Atoi(remaining)
		if rem < 10 {
			s.logger.Warn("GitHub rate limit nearly exhausted", zap.Int("remaining", rem))
		}
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("resource not found: %s", url)
	}
	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limited by GitHub API")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d for %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	return body, nil
}

func (s *githubScraper) FetchUserCommits(ctx context.Context, username, repo string, since time.Time) (int, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/commits?author=%s&since=%s&per_page=100",
		githubAPIBase, username, repo, username, since.Format(time.RFC3339))

	count := 0
	page := 1
	for {
		pagedURL := fmt.Sprintf("%s&page=%d", url, page)
		body, err := s.doRequest(ctx, pagedURL)
		if err != nil {
			s.logger.Warn("Failed to fetch commits", zap.String("repo", repo), zap.Error(err))
			return count, nil
		}

		var commits []map[string]interface{}
		if err := json.Unmarshal(body, &commits); err != nil {
			return count, fmt.Errorf("failed to parse commits: %w", err)
		}
		count += len(commits)
		if len(commits) < 100 {
			break
		}
		page++
	}
	return count, nil
}

func (s *githubScraper) FetchPullRequests(ctx context.Context, username, repo string) (*PRStats, error) {
	stats := &PRStats{}

	// Fetch opened PRs
	openURL := fmt.Sprintf("%s/repos/%s/%s/pulls?state=all&per_page=100", githubAPIBase, username, repo)
	body, err := s.doRequest(ctx, openURL)
	if err != nil {
		s.logger.Warn("Failed to fetch PRs", zap.String("repo", repo), zap.Error(err))
		return stats, nil
	}

	var prs []map[string]interface{}
	if err := json.Unmarshal(body, &prs); err != nil {
		return stats, fmt.Errorf("failed to parse PRs: %w", err)
	}

	for _, pr := range prs {
		user, ok := pr["user"].(map[string]interface{})
		if !ok {
			continue
		}
		login, _ := user["login"].(string)
		if login != username {
			continue
		}
		stats.Opened++
		if state, ok := pr["merged_at"].(string); ok && state != "" {
			stats.Merged++
		}
	}

	// Fetch PR reviews
	reviewURL := fmt.Sprintf("%s/repos/%s/%s/pulls/reviews?per_page=100", githubAPIBase, username, repo)
	reviewBody, err := s.doRequest(ctx, reviewURL)
	if err == nil {
		var reviews []map[string]interface{}
		if json.Unmarshal(reviewBody, &reviews) == nil {
			for _, review := range reviews {
				user, ok := review["user"].(map[string]interface{})
				if !ok {
					continue
				}
				login, _ := user["login"].(string)
				if login == username {
					stats.Reviews++
				}
			}
		}
	}

	return stats, nil
}

func (s *githubScraper) FetchCodeReviews(ctx context.Context, username, repo string) (int, error) {
	url := fmt.Sprintf("%s/search/issues?q=repo:%s/%s+type:pr+reviewed-by:%s&per_page=100",
		githubAPIBase, username, repo, username)
	body, err := s.doRequest(ctx, url)
	if err != nil {
		s.logger.Warn("Failed to fetch code reviews", zap.String("repo", repo), zap.Error(err))
		return 0, nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, fmt.Errorf("failed to parse reviews response: %w", err)
	}
	count, _ := result["total_count"].(float64)
	return int(count), nil
}

func (s *githubScraper) FetchIssues(ctx context.Context, username, repo string) (int, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/issues?state=closed&assignee=%s&per_page=100",
		githubAPIBase, username, repo, username)
	body, err := s.doRequest(ctx, url)
	if err != nil {
		s.logger.Warn("Failed to fetch issues", zap.String("repo", repo), zap.Error(err))
		return 0, nil
	}

	var issues []map[string]interface{}
	if err := json.Unmarshal(body, &issues); err != nil {
		return 0, fmt.Errorf("failed to parse issues: %w", err)
	}
	return len(issues), nil
}

func (s *githubScraper) FetchUserRepos(ctx context.Context, username string) ([]string, error) {
	url := fmt.Sprintf("%s/users/%s/repos?per_page=100&sort=updated&type=owner", githubAPIBase, username)
	body, err := s.doRequest(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch repos for %s: %w", username, err)
	}

	var repos []map[string]interface{}
	if err := json.Unmarshal(body, &repos); err != nil {
		return nil, fmt.Errorf("failed to parse repos: %w", err)
	}

	var names []string
	for _, repo := range repos {
		name, _ := repo["name"].(string)
		if name != "" {
			names = append(names, name)
		}
	}
	return names, nil
}

func (s *githubScraper) FetchUserProfile(ctx context.Context, username string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/users/%s", githubAPIBase, username)
	body, err := s.doRequest(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile for %s: %w", username, err)
	}

	var profile map[string]interface{}
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, fmt.Errorf("failed to parse profile: %w", err)
	}
	return profile, nil
}
