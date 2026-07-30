package provider

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AnthropicRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	Messages  []Message `json:"messages"`
	System    string    `json:"system,omitempty"`
}

type AnthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Content []struct {
		Text string `json:"text"`
		Type string `json:"type"`
	} `json:"content"`
	Usage struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
	Error *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type AnthropicClient struct {
	apiKey     string
	model      string
	maxTokens  int
	httpClient *http.Client
}

func NewAnthropicClient(apiKey, model string, maxTokens int) *AnthropicClient {
	return &AnthropicClient{
		apiKey:    apiKey,
		model:     model,
		maxTokens: maxTokens,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

func (c *AnthropicClient) SendMessage(messages []Message, system string) (*AnthropicResponse, error) {
	req := AnthropicRequest{
		Model:     c.model,
		MaxTokens: c.maxTokens,
		Messages:  messages,
		System:    system,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result AnthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Error != nil {
		log.Error().Str("type", result.Error.Type).Str("message", result.Error.Message).Msg("anthropic api error")
		return nil, fmt.Errorf("anthropic error: %s - %s", result.Error.Type, result.Error.Message)
	}

	return &result, nil
}
