package bigquery

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/bigquery"
	"go.uber.org/zap"
	"google.golang.org/api/option"
)

const (
	datasetID = "workpulse_analytics"
	tableID   = "developer_metrics"
)

// MetricRow represents a single row in the BigQuery metrics table
type MetricRow struct {
	DeveloperID string    `bigquery:"developer_id"`
	Username    string    `bigquery:"username"`
	MetricType  string    `bigquery:"metric_type"`
	Value       float64   `bigquery:"value"`
	Period      string    `bigquery:"period"`
	Timestamp   time.Time `bigquery:"timestamp"`
}

// Client wraps BigQuery operations for WorkPulse analytics
type Client struct {
	bq        *bigquery.Client
	projectID string
	logger    *zap.Logger
}

// NewClient creates a new BigQuery analytics client
func NewClient(ctx context.Context, projectID string, logger *zap.Logger, opts ...option.ClientOption) (*Client, error) {
	bqClient, err := bigquery.NewClient(ctx, projectID, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create BigQuery client: %w", err)
	}
	return &Client{bq: bqClient, projectID: projectID, logger: logger}, nil
}

// Close closes the BigQuery client
func (c *Client) Close() error {
	return c.bq.Close()
}

// EnsureDataset creates the dataset and table if they don't exist
func (c *Client) EnsureDataset(ctx context.Context) error {
	ds := c.bq.Dataset(datasetID)
	if _, err := ds.Metadata(ctx); err != nil {
		// Create dataset
		if createErr := ds.Create(ctx, &bigquery.DatasetMetadata{
			Location:    "asia-south1",
			Description: "WorkPulse developer analytics",
		}); createErr != nil {
			return fmt.Errorf("failed to create dataset: %w", createErr)
		}
		c.logger.Info("Created BigQuery dataset", zap.String("dataset", datasetID))
	}

	table := ds.Table(tableID)
	if _, err := table.Metadata(ctx); err != nil {
		schema := bigquery.Schema{
			{Name: "developer_id", Type: bigquery.StringFieldType, Required: true},
			{Name: "username", Type: bigquery.StringFieldType, Required: true},
			{Name: "metric_type", Type: bigquery.StringFieldType, Required: true},
			{Name: "value", Type: bigquery.FloatFieldType, Required: true},
			{Name: "period", Type: bigquery.StringFieldType, Required: true},
			{Name: "timestamp", Type: bigquery.TimestampFieldType, Required: true},
		}
		if createErr := table.Create(ctx, &bigquery.TableMetadata{
			Schema:      schema,
			Description: "Developer contribution metrics over time",
			TimePartitioning: &bigquery.TimePartitioning{
				Type:  bigquery.DayPartitioningType,
				Field: "timestamp",
			},
		}); createErr != nil {
			return fmt.Errorf("failed to create table: %w", createErr)
		}
		c.logger.Info("Created BigQuery table", zap.String("table", tableID))
	}
	return nil
}

// StreamMetrics streams metric rows to BigQuery
func (c *Client) StreamMetrics(ctx context.Context, rows []*MetricRow) error {
	inserter := c.bq.Dataset(datasetID).Table(tableID).Inserter()
	if err := inserter.Put(ctx, rows); err != nil {
		return fmt.Errorf("failed to stream metrics to BigQuery: %w", err)
	}
	c.logger.Info("Streamed metrics to BigQuery", zap.Int("rows", len(rows)))
	return nil
}

// QueryTopContributors returns top N contributors for a given period
func (c *Client) QueryTopContributors(ctx context.Context, period string, limit int) ([]map[string]interface{}, error) {
	query := c.bq.Query(fmt.Sprintf(`
		SELECT
			username,
			SUM(value) as total_score,
			COUNT(*) as metric_count
		FROM %s.%s.%s
		WHERE period = @period
			AND metric_type = 'contribution_score'
			AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
		GROUP BY username
		ORDER BY total_score DESC
		LIMIT %d
	`, c.projectID, datasetID, tableID, limit))

	query.Parameters = []bigquery.QueryParameter{
		{Name: "period", Value: period},
	}

	it, err := query.Read(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to query top contributors: %w", err)
	}

	var results []map[string]interface{}
	for {
		var row map[string]bigquery.Value
		if err := it.Next(&row); err != nil {
			break
		}
		result := make(map[string]interface{})
		for k, v := range row {
			result[k] = v
		}
		results = append(results, result)
	}
	return results, nil
}
