package aiservice

type AIRequest struct {
	Prompt    string   `json:"prompt"`
	Model     string   `json:"model"`
	MaxTokens int      `json:"max_tokens"`
	Context   []string `json:"context"`
}

type AIResponse struct {
	Content string `json:"content"`
	Model   string `json:"model"`
	Usage   AIUsage `json:"usage"`
}

type AIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type AIServiceConfig struct {
	Provider    string `json:"provider"`
	Model       string `json:"model"`
	MaxTokens   int    `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
}
