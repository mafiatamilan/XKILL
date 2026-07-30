package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port         string
	NATSURL      string
	SandboxImage string
	CPULimit     string
	MemoryLimit  string
	TimeLimit    int
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:         getEnv("PORT", "8081"),
		NATSURL:      getEnvRequired("NATS_URL"),
		SandboxImage: getEnv("SANDBOX_IMAGE", "judge-sandbox:latest"),
		CPULimit:     getEnv("CPU_LIMIT", "1"),
		MemoryLimit:  getEnv("MEMORY_LIMIT", "256m"),
		TimeLimit:    getEnvInt("TIME_LIMIT_MS", 5000),
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
