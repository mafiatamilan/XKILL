package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/xkill/services/ai-gateway/internal/config"
	"github.com/xkill/services/ai-gateway/internal/provider"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func main() {
	log.Logger = zerolog.New(os.Stderr).With().Timestamp().Caller().Logger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	client := provider.NewAnthropicClient(cfg.AnthropicKey, cfg.AnthropicModel, cfg.MaxTokens)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/api/v1/chat", handleChat(client))
	mux.HandleFunc("/api/v1/code-review", handleCodeReview(client))
	mux.HandleFunc("/api/v1/resume-analyze", handleResumeAnalyze(client))
	mux.HandleFunc("/api/v1/interview-prep", handleInterviewPrep(client))

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("starting ai-gateway server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down ai-gateway")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)

	log.Info().Msg("ai-gateway exited gracefully")
}

func handleChat(client *provider.AnthropicClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "not implemented"})
	}
}

func handleCodeReview(client *provider.AnthropicClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "not implemented"})
	}
}

func handleResumeAnalyze(client *provider.AnthropicClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "not implemented"})
	}
}

func handleInterviewPrep(client *provider.AnthropicClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "not implemented"})
	}
}

func initOTel(ctx context.Context, endpoint string) func(context.Context) error {
	if endpoint == "" {
		return func(ctx context.Context) error { return nil }
	}
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithEndpoint(endpoint))
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create otel exporter")
	}
	res := resource.NewWithAttributes(semconv.SchemaURL, semconv.ServiceName("ai-gateway"))
	tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exporter), sdktrace.WithResource(res))
	otel.SetTracerProvider(tp)
	return tp.Shutdown
}
