package gamification

import "context"

type GamificationService interface {
	GetUserBadges(ctx context.Context, userID string) ([]UserBadge, error)
	GetUserAchievements(ctx context.Context, userID string) ([]UserAchievement, error)
	GetUserXP(ctx context.Context, userID string) (*UserXP, error)
	AwardXP(ctx context.Context, userID string, xp int, reason string) error
	AwardBadge(ctx context.Context, userID, badgeID string) error
	CheckAchievements(ctx context.Context, userID string) ([]Achievement, error)
}
