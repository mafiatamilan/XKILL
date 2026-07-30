package aiservice

import "context"

type Repository interface {
	GetConfig(ctx context.Context) (*AIServiceConfig, error)
	SaveConfig(ctx context.Context, config *AIServiceConfig) error
	LogUsage(ctx context.Context, userID string, usage AIUsage) error
}
