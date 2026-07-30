package analytics

type Event struct {
	Name       string      `json:"name"`
	Properties interface{} `json:"properties"`
	UserID     string      `json:"user_id"`
	Timestamp  int64       `json:"timestamp"`
}

type DashboardMetric struct {
	Name   string  `json:"name"`
	Value  float64 `json:"value"`
	Change float64 `json:"change"`
}

type TimeSeriesPoint struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

type Report struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	Config  string `json:"config"`
	Data    string `json:"data"`
}
