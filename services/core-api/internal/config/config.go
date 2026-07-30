package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	RedisURL       string
	NATSURL        string
	JWTSecret      string
	OTelEndpoint   string
	AllowedOrigins string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnvRequired("DATABASE_URL"),
		RedisURL:       getEnvRequired("REDIS_URL"),
		NATSURL:        getEnvRequired("NATS_URL"),
		JWTSecret:      getEnvRequired("JWT_SECRET"),
		OTelEndpoint:   os.Getenv("OTEL_ENDPOINT"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),
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
