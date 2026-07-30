package leaderboard

type LeaderboardEntry struct {
	Rank       int    `json:"rank"`
	UserID     string `json:"user_id"`
	Score      int    `json:"score"`
	TotalSolved int   `json:"total_solved"`
	CollegeID  string `json:"college_id"`
}

type LeaderboardFilter struct {
	CollegeID string `json:"college_id"`
	TimeRange string `json:"time_range"`
	Limit     int    `json:"limit"`
}

type WeeklyTop struct {
	UserID string `json:"user_id"`
	Score  int    `json:"score"`
	Week   string `json:"week"`
}
