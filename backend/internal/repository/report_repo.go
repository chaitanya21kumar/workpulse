package repository

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/chaitanya21kumar/workpulse/backend/internal/models"
	"google.golang.org/api/iterator"
)

const reportsCollection = "reports"

type firestoreReportRepo struct {
	client *firestore.Client
}

// NewFirestoreReportRepository creates a new Firestore-backed ReportRepository
func NewFirestoreReportRepository(client *firestore.Client) ReportRepository {
	return &firestoreReportRepo{client: client}
}

func (r *firestoreReportRepo) Save(ctx context.Context, report *models.Report) error {
	report.GeneratedAt = time.Now()
	_, err := r.client.Collection(reportsCollection).Doc(report.ID).Set(ctx, report)
	if err != nil {
		return fmt.Errorf("failed to save report: %w", err)
	}
	return nil
}

func (r *firestoreReportRepo) GetByDeveloperID(ctx context.Context, devID, period string) (*models.Report, error) {
	query := r.client.Collection(reportsCollection).
		Where("developer_id", "==", devID).
		OrderBy("generated_at", firestore.Desc).
		Limit(1)
	if period != "" {
		query = r.client.Collection(reportsCollection).
			Where("developer_id", "==", devID).
			Where("period", "==", period).
			OrderBy("generated_at", firestore.Desc).
			Limit(1)
	}
	iter := query.Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get report for developer %s: %w", devID, err)
	}
	var report models.Report
	if err := doc.DataTo(&report); err != nil {
		return nil, fmt.Errorf("failed to decode report: %w", err)
	}
	return &report, nil
}

func (r *firestoreReportRepo) ListRecent(ctx context.Context, limit int) ([]*models.Report, error) {
	if limit <= 0 {
		limit = 20
	}
	iter := r.client.Collection(reportsCollection).
		OrderBy("generated_at", firestore.Desc).
		Limit(limit).
		Documents(ctx)
	defer iter.Stop()

	var reports []*models.Report
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list reports: %w", err)
		}
		var report models.Report
		if err := doc.DataTo(&report); err != nil {
			return nil, fmt.Errorf("failed to decode report: %w", err)
		}
		reports = append(reports, &report)
	}
	return reports, nil
}
