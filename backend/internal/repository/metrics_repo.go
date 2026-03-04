package repository

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"google.golang.org/api/iterator"
)

const (
	metricsCollection = "metrics"
)

type firestoreMetricsRepo struct {
	client *firestore.Client
}

// NewFirestoreMetricsRepository creates a new Firestore-backed MetricsRepository
func NewFirestoreMetricsRepository(client *firestore.Client) MetricsRepository {
	return &firestoreMetricsRepo{client: client}
}

func (r *firestoreMetricsRepo) SaveMetrics(ctx context.Context, metrics *models.GitHubMetrics) error {
	metrics.FetchedAt = time.Now()
	docID := fmt.Sprintf("%s_%s_%s", metrics.Username, metrics.RepoName, metrics.Period)
	metrics.ID = docID
	_, err := r.client.Collection(metricsCollection).Doc(docID).Set(ctx, metrics)
	if err != nil {
		return fmt.Errorf("failed to save metrics: %w", err)
	}
	return nil
}

func (r *firestoreMetricsRepo) GetMetricsByUsername(ctx context.Context, username, period string) ([]*models.GitHubMetrics, error) {
	query := r.client.Collection(metricsCollection).Where("username", "==", username)
	if period != "" {
		query = query.Where("period", "==", period)
	}
	iter := query.Documents(ctx)
	defer iter.Stop()

	var result []*models.GitHubMetrics
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get metrics for %s: %w", username, err)
		}
		var m models.GitHubMetrics
		if err := doc.DataTo(&m); err != nil {
			return nil, fmt.Errorf("failed to decode metrics: %w", err)
		}
		result = append(result, &m)
	}
	return result, nil
}

func (r *firestoreMetricsRepo) GetLeaderboard(ctx context.Context, period string, limit int) ([]*models.Developer, error) {
	if limit <= 0 {
		limit = 10
	}
	iter := r.client.Collection(developersCollection).
		OrderBy("contribution_score", firestore.Desc).
		Limit(limit).
		Documents(ctx)
	defer iter.Stop()

	var devs []*models.Developer
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get leaderboard: %w", err)
		}
		var dev models.Developer
		if err := doc.DataTo(&dev); err != nil {
			return nil, fmt.Errorf("failed to decode developer: %w", err)
		}
		devs = append(devs, &dev)
	}
	return devs, nil
}
