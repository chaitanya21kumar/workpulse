package models

import "time"

// Developer represents a tracked developer in the system
type Developer struct {
	ID                string    `json:"id" firestore:"id"`
	GitHubUsername    string    `json:"github_username" firestore:"github_username"`
	Name              string    `json:"display_name" firestore:"name"`
	Email             string    `json:"email" firestore:"email"`
	AvatarURL         string    `json:"avatar_url" firestore:"avatar_url"`
	TotalCommits      int       `json:"commits" firestore:"total_commits"`
	TotalPRs          int       `json:"prs_merged" firestore:"total_prs"`
	TotalReviews      int       `json:"reviews_given" firestore:"total_reviews"`
	TotalIssues       int       `json:"issues_closed" firestore:"total_issues"`
	ContributionScore float64   `json:"score" firestore:"contribution_score"`
	Tier              string    `json:"tier" firestore:"tier"`
	LastUpdated       time.Time `json:"last_updated" firestore:"last_updated"`
	CreatedAt         time.Time `json:"created_at" firestore:"created_at"`
}

// GitHubMetrics holds scraped GitHub activity data
type GitHubMetrics struct {
	ID           string    `json:"id" firestore:"id"`
	Username     string    `json:"username" firestore:"username"`
	RepoName     string    `json:"repo_name" firestore:"repo_name"`
	Commits      int       `json:"commits" firestore:"commits"`
	PRsOpened    int       `json:"prs_opened" firestore:"prs_opened"`
	PRsMerged    int       `json:"prs_merged" firestore:"prs_merged"`
	CodeReviews  int       `json:"code_reviews" firestore:"code_reviews"`
	IssuesClosed int       `json:"issues_closed" firestore:"issues_closed"`
	LinesAdded   int       `json:"lines_added" firestore:"lines_added"`
	LinesDeleted int       `json:"lines_deleted" firestore:"lines_deleted"`
	Period       string    `json:"period" firestore:"period"`
	FetchedAt    time.Time `json:"fetched_at" firestore:"fetched_at"`
}

// Report holds an AI-generated performance report
type Report struct {
	ID          string             `json:"id" firestore:"id"`
	DeveloperID string             `json:"developer_id" firestore:"developer_id"`
	Username    string             `json:"username" firestore:"username"`
	Period      string             `json:"period" firestore:"period"`
	Score       float64            `json:"score" firestore:"score"`
	Tier        string             `json:"tier" firestore:"tier"`
	AIInsights  *AIInsights        `json:"ai_insights" firestore:"ai_insights"`
	Breakdown   map[string]float64 `json:"breakdown" firestore:"breakdown"`
	GeneratedAt time.Time          `json:"generated_at" firestore:"generated_at"`
}

// AIInsights holds the structured AI-generated insights
type AIInsights struct {
	Summary        string   `json:"summary" firestore:"summary"`
	Strengths      []string `json:"strengths" firestore:"strengths"`
	Improvements   []string `json:"improvements" firestore:"improvements"`
	ActionItems    []string `json:"action_items" firestore:"action_items"`
	TeamImpact     string   `json:"team_impact" firestore:"team_impact"`
	PredictedTrend string   `json:"predicted_trend" firestore:"predicted_trend"`
}

// ScrapeJob tracks GitHub scraping jobs
type ScrapeJob struct {
	ID             string    `json:"id" firestore:"id"`
	GitHubUsername string    `json:"github_username" firestore:"github_username"`
	Repos          []string  `json:"repos" firestore:"repos"`
	Status         string    `json:"status" firestore:"status"` // pending, running, completed, failed
	Error          string    `json:"error,omitempty" firestore:"error,omitempty"`
	CreatedAt      time.Time `json:"created_at" firestore:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" firestore:"updated_at"`
}

// APIResponse is the standard API response envelope
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
	Code    string      `json:"code,omitempty"`
}

// PaginationParams holds pagination query parameters
type PaginationParams struct {
	Limit  int `form:"limit,default=20"`
	Offset int `form:"offset,default=0"`
}
