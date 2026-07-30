package analytics

import "context"

type AnalyticsService interface {
	TrackEvent(ctx context.Context, event Event) error
	GetDashboardMetrics(ctx context.Context, collegeID string) ([]DashboardMetric, error)
	GetTimeSeries(ctx context.Context, metric string, from, to int64) ([]TimeSeriesPoint, error)
	GenerateReport(ctx context.Context, report *Report) error
	GetReports(ctx context.Context) ([]Report, error)
}
