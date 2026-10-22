package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"jobtracker/internal/config"
	"jobtracker/internal/handlers"
	"jobtracker/internal/hh"
	"jobtracker/internal/ingest"
	"jobtracker/internal/llm"
	"jobtracker/internal/storage"
	"jobtracker/migrations"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := migrate(cfg.DatabaseURL); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer pool.Close()

	llmClient, err := buildLLM(cfg)
	if err != nil {
		return err
	}

	store := storage.New(pool)
	ingestService := ingest.NewService(store, hh.NewClient(cfg.HHUserAgent), llmClient)
	handler := handlers.New(store, ingestService)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handlers.Recover(handlers.Logging(handlers.CORS(cfg.CORSOrigins)(handler.Routes()))),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      3 * time.Minute,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("server started", "addr", "http://localhost:"+cfg.Port)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		slog.Info("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return server.Shutdown(shutdownCtx)
}

func migrate(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, ".")
}

func buildLLM(cfg config.Config) (*llm.Fallback, error) {
	var clients []llm.Client

	if cfg.OpenRouterAPIKey != "" {
		clients = append(clients, llm.NewOpenRouter(cfg.OpenRouterBaseURL, cfg.OpenRouterAPIKey, cfg.OpenRouterModel))
	}

	if cfg.GigaChatAuthKey != "" {
		gigaChat, err := llm.NewGigaChat(cfg.GigaChatAuthKey, cfg.GigaChatScope, cfg.GigaChatModel, cfg.GigaChatCACert)
		if err != nil {
			return nil, err
		}
		clients = append(clients, gigaChat)
	}

	if len(clients) == 0 {
		slog.Warn("no LLM keys configured: only hh.ru vacancies with key skills will be parsed")
	}

	return llm.NewFallback(clients...), nil
}