package leaderboard

import "context"

type LeaderboardService interface {
	GetGlobalLeaderboard(ctx context.Context, filter LeaderboardFilter) ([]LeaderboardEntry, error)
	GetCollegeLeaderboard(ctx context.Context, collegeID string) ([]LeaderboardEntry, error)
	GetUserRank(ctx context.Context, userID string) (*LeaderboardEntry, error)
	GetWeeklyTop(ctx context.Context) ([]WeeklyTop, error)
}
