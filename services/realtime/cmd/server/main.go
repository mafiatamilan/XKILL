package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/xkill/services/realtime/internal/config"
	"github.com/xkill/services/realtime/internal/hub"
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

	nc, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to nats")
	}
	defer nc.Close()

	h := hub.New(nc)

	go h.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/ws", h.HandleWebSocket)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("starting realtime server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down realtime")

	h.Stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)

	log.Info().Msg("realtime exited gracefully")
}

func initOTel(ctx context.Context, endpoint string) func(context.Context) error {
	if endpoint == "" {
		return func(ctx context.Context) error { return nil }
	}
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithEndpoint(endpoint))
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create otel exporter")
	}
	res := resource.NewWithAttributes(semconv.SchemaURL, semconv.ServiceName("realtime"))
	tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exporter), sdktrace.WithResource(res))
	otel.SetTracerProvider(tp)
	return tp.Shutdown
}
