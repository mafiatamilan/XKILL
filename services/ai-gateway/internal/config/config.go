package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port          string
	AnthropicKey  string
	AnthropicModel string
	MaxTokens     int
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:           getEnv("PORT", "8082"),
		AnthropicKey:   getEnvRequired("ANTHROPIC_API_KEY"),
		AnthropicModel: getEnv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
		MaxTokens:      getEnvInt("MAX_TOKENS", 4096),
	}
	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

func getEnvRequired(key string) string {
	val := os.Getenv(key)
	if val == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return val
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
