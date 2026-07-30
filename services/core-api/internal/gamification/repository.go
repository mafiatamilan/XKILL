package gamification

import "context"

type Repository interface {
	ListBadges(ctx context.Context) ([]Badge, error)
	GetUserBadges(ctx context.Context, userID string) ([]UserBadge, error)
	AwardBadge(ctx context.Context, ub *UserBadge) error
	ListAchievements(ctx context.Context) ([]Achievement, error)
	GetUserAchievements(ctx context.Context, userID string) ([]UserAchievement, error)
	AwardAchievement(ctx context.Context, ua *UserAchievement) error
	GetUserXP(ctx context.Context, userID string) (*UserXP, error)
	UpsertUserXP(ctx context.Context, uxp *UserXP) error
}
