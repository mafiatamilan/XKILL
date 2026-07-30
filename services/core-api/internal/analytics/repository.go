package analytics

import "context"

type Repository interface {
	InsertEvent(ctx context.Context, event Event) error
	GetDashboardMetrics(ctx context.Context, collegeID string) ([]DashboardMetric, error)
	GetTimeSeries(ctx context.Context, metric string, from, to int64) ([]TimeSeriesPoint, error)
	CreateReport(ctx context.Context, report *Report) error
	ListReports(ctx context.Context) ([]Report, error)
}
