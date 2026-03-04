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
	developersCollection = "developers"
)

// firestoreDeveloperRepo implements DeveloperRepository using Firestore
type firestoreDeveloperRepo struct {
	client *firestore.Client
}

// NewFirestoreDeveloperRepository creates a new Firestore-backed DeveloperRepository
func NewFirestoreDeveloperRepository(client *firestore.Client) DeveloperRepository {
	return &firestoreDeveloperRepo{client: client}
}

func (r *firestoreDeveloperRepo) Create(ctx context.Context, dev *models.Developer) error {
	dev.CreatedAt = time.Now()
	dev.LastUpdated = time.Now()
	_, err := r.client.Collection(developersCollection).Doc(dev.ID).Set(ctx, dev)
	if err != nil {
		return fmt.Errorf("failed to create developer: %w", err)
	}
	return nil
}

func (r *firestoreDeveloperRepo) GetByID(ctx context.Context, id string) (*models.Developer, error) {
	doc, err := r.client.Collection(developersCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get developer by id %s: %w", id, err)
	}
	var dev models.Developer
	if err := doc.DataTo(&dev); err != nil {
		return nil, fmt.Errorf("failed to decode developer: %w", err)
	}
	return &dev, nil
}

func (r *firestoreDeveloperRepo) GetByGitHubUsername(ctx context.Context, username string) (*models.Developer, error) {
	iter := r.client.Collection(developersCollection).
		Where("github_username", "==", username).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query developer by username %s: %w", username, err)
	}
	var dev models.Developer
	if err := doc.DataTo(&dev); err != nil {
		return nil, fmt.Errorf("failed to decode developer: %w", err)
	}
	return &dev, nil
}

func (r *firestoreDeveloperRepo) List(ctx context.Context, limit int) ([]*models.Developer, error) {
	if limit <= 0 {
		limit = 20
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
			return nil, fmt.Errorf("failed to list developers: %w", err)
		}
		var dev models.Developer
		if err := doc.DataTo(&dev); err != nil {
			return nil, fmt.Errorf("failed to decode developer: %w", err)
		}
		devs = append(devs, &dev)
	}
	return devs, nil
}

func (r *firestoreDeveloperRepo) Update(ctx context.Context, dev *models.Developer) error {
	dev.LastUpdated = time.Now()
	_, err := r.client.Collection(developersCollection).Doc(dev.ID).Set(ctx, dev)
	if err != nil {
		return fmt.Errorf("failed to update developer %s: %w", dev.ID, err)
	}
	return nil
}

func (r *firestoreDeveloperRepo) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection(developersCollection).Doc(id).Delete(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete developer %s: %w", id, err)
	}
	return nil
}
