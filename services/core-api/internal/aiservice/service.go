package aiservice

import "context"

type AIService interface {
	Generate(ctx context.Context, req AIRequest) (*AIResponse, error)
	GenerateStream(ctx context.Context, req AIRequest) (<-chan string, error)
	GetConfig(ctx context.Context) (*AIServiceConfig, error)
	UpdateConfig(ctx context.Context, config *AIServiceConfig) error
}
