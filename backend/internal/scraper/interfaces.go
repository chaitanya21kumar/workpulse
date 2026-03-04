package scraper

import (
	"context"
	"time"
)

// PRStats holds pull request statistics for a user in a repo
type PRStats struct {
	Opened   int
	Merged   int
	Reviews  int
	Comments int
}

// GitHubScraper defines the interface for fetching GitHub data
//
//go:generate mockery --name=GitHubScraper --output=../mocks --outpkg=mocks
type GitHubScraper interface {
	FetchUserCommits(ctx context.Context, username, repo string, since time.Time) (int, error)
	FetchPullRequests(ctx context.Context, username, repo string) (*PRStats, error)
	FetchCodeReviews(ctx context.Context, username, repo string) (int, error)
	FetchIssues(ctx context.Context, username, repo string) (int, error)
	FetchUserRepos(ctx context.Context, username string) ([]string, error)
	FetchUserProfile(ctx context.Context, username string) (map[string]interface{}, error)
}
