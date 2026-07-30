package search

type SearchQuery struct {
	Query    string   `json:"query"`
	Type     string   `json:"type"`
	Filters  map[string]string `json:"filters"`
	Page     int      `json:"page"`
	PageSize int      `json:"page_size"`
}

type SearchResult struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"`
	Title   string  `json:"title"`
	Summary string  `json:"summary"`
	Score   float64 `json:"score"`
	URL     string  `json:"url"`
}

type SearchResponse struct {
	Results    []SearchResult `json:"results"`
	TotalCount int            `json:"total_count"`
	Page       int            `json:"page"`
}
