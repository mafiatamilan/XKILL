package gamification

import "time"

type Badge struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IconURL     string `json:"icon_url"`
	Category    string `json:"category"`
}

type UserBadge struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	BadgeID   string    `json:"badge_id"`
	EarnedAt  time.Time `json:"earned_at"`
}

type Achievement struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	XP          int    `json:"xp"`
	Criteria    string `json:"criteria"`
}

type UserAchievement struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	AchievementID string    `json:"achievement_id"`
	EarnedAt      time.Time `json:"earned_at"`
}

type UserXP struct {
	UserID    string    `json:"user_id"`
	TotalXP   int       `json:"total_xp"`
	Level     int       `json:"level"`
	UpdatedAt time.Time `json:"updated_at"`
}
