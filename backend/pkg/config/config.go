package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

// Config holds all application configuration
type Config struct {
	Port              string
	Environment       string
	GinMode           string
	FirebaseProjectID string
	GitHubToken       string
	MLServiceURL      string
	GroqAPIKey        string
	BigQueryProjectID string
	BigQueryDatasetID string
	AllowedOrigins    []string
}

// Load reads configuration from environment variables
func Load(logger *zap.Logger) *Config {
	// Try to load .env file — ignore error in production
	if err := godotenv.Load(); err != nil {
		logger.Info("No .env file found, using environment variables")
	}

	originsStr := getEnv("ALLOWED_ORIGINS", "https://workpulse-ai.netlify.app,http://localhost:3000")
	origins := strings.Split(originsStr, ",")
	for i, o := range origins {
		origins[i] = strings.TrimSpace(o)
	}

	return &Config{
		Port:              getEnv("PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "production"),
		GinMode:           getEnv("GIN_MODE", "release"),
		FirebaseProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
		GitHubToken:       getEnv("GITHUB_TOKEN", ""),
		MLServiceURL:      getEnv("ML_SERVICE_URL", "http://localhost:8000"),
		GroqAPIKey:        getEnv("GROQ_API_KEY", ""),
		BigQueryProjectID: getEnv("BIGQUERY_PROJECT_ID", ""),
		BigQueryDatasetID: getEnv("BIGQUERY_DATASET_ID", "workpulse_analytics"),
		AllowedOrigins:    origins,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
