package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/xkill/services/core-api/internal/config"
	"github.com/xkill/services/core-api/internal/server"
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to postgres")
	}
	defer pool.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("failed to connect to redis")
	}
	defer rdb.Close()

	nc, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to nats")
	}
	defer nc.Close()

	js, err := nc.JetStream()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create jetstream context")
	}

	if cfg.OTelEndpoint != "" {
		shutdown, err := initOTel(ctx, cfg)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to init opentelemetry")
		}
		defer shutdown(ctx)
	}

	engine := server.New(cfg, pool, rdb, js)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("starting core-api server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down server")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("server exited gracefully")
}

func initOTel(ctx context.Context, cfg *config.Config) (func(context.Context) error, error) {
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithEndpoint(cfg.OTelEndpoint))
	if err != nil {
		return nil, err
	}

	res := resource.NewWithAttributes(semconv.SchemaURL, semconv.ServiceName("core-api"))
	tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exporter), sdktrace.WithResource(res))
	otel.SetTracerProvider(tp)
	return tp.Shutdown, nil
}
