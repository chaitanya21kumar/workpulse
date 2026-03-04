package repository

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"google.golang.org/api/iterator"
)

const scrapeJobsCollection = "scrape_jobs"

type firestoreScrapeJobRepo struct {
	client *firestore.Client
}

// NewFirestoreScrapeJobRepository creates a new Firestore-backed ScrapeJobRepository
func NewFirestoreScrapeJobRepository(client *firestore.Client) ScrapeJobRepository {
	return &firestoreScrapeJobRepo{client: client}
}

func (r *firestoreScrapeJobRepo) Create(ctx context.Context, job *models.ScrapeJob) error {
	job.CreatedAt = time.Now()
	job.UpdatedAt = time.Now()
	_, err := r.client.Collection(scrapeJobsCollection).Doc(job.ID).Set(ctx, job)
	if err != nil {
		return fmt.Errorf("failed to create scrape job: %w", err)
	}
	return nil
}

func (r *firestoreScrapeJobRepo) GetByID(ctx context.Context, id string) (*models.ScrapeJob, error) {
	doc, err := r.client.Collection(scrapeJobsCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get scrape job %s: %w", id, err)
	}
	var job models.ScrapeJob
	if err := doc.DataTo(&job); err != nil {
		return nil, fmt.Errorf("failed to decode scrape job: %w", err)
	}
	return &job, nil
}

func (r *firestoreScrapeJobRepo) UpdateStatus(ctx context.Context, id, status, errMsg string) error {
	updates := []firestore.Update{
		{Path: "status", Value: status},
		{Path: "updated_at", Value: time.Now()},
	}
	if errMsg != "" {
		updates = append(updates, firestore.Update{Path: "error", Value: errMsg})
	}
	_, err := r.client.Collection(scrapeJobsCollection).Doc(id).Update(ctx, updates)
	if err != nil {
		return fmt.Errorf("failed to update scrape job status: %w", err)
	}
	return nil
}

func (r *firestoreScrapeJobRepo) ListByUsername(ctx context.Context, username string) ([]*models.ScrapeJob, error) {
	iter := r.client.Collection(scrapeJobsCollection).
		Where("github_username", "==", username).
		OrderBy("created_at", firestore.Desc).
		Limit(10).
		Documents(ctx)
	defer iter.Stop()

	var jobs []*models.ScrapeJob
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list scrape jobs: %w", err)
		}
		var job models.ScrapeJob
		if err := doc.DataTo(&job); err != nil {
			return nil, fmt.Errorf("failed to decode scrape job: %w", err)
		}
		jobs = append(jobs, &job)
	}
	return jobs, nil
}
