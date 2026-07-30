package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port    string
	NATSURL string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:    getEnv("PORT", "8084"),
		NATSURL: getEnvRequired("NATS_URL"),
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
