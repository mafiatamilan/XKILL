package leaderboard

import "context"

type Repository interface {
	GetLeaderboard(ctx context.Context, filter LeaderboardFilter) ([]LeaderboardEntry, error)
	GetCollegeLeaderboard(ctx context.Context, collegeID string) ([]LeaderboardEntry, error)
	GetUserRank(ctx context.Context, userID string) (*LeaderboardEntry, error)
	GetWeeklyTop(ctx context.Context) ([]WeeklyTop, error)
	UpsertScore(ctx context.Context, entry *LeaderboardEntry) error
}
