package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lucho2027/guitar-comeback/internal/api"
	"github.com/lucho2027/guitar-comeback/internal/config"
	"github.com/lucho2027/guitar-comeback/internal/plan"
	"github.com/lucho2027/guitar-comeback/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("startup failed", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx := context.Background()
	if err := store.EnsureDatabase(ctx, cfg.DatabaseURL); err != nil {
		return err
	}
	if err := store.Migrate(ctx, cfg.DatabaseURL); err != nil {
		return err
	}
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("database ping: %w", err)
	}
	startedOn := plan.FormatDate(plan.MondayOnOrBefore(plan.Today()))
	if err := store.Seed(ctx, pool, cfg.SeedEmail, cfg.SeedPassword, cfg.SeedName, startedOn); err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           api.New(store.New(pool)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	slog.Info("api listening", "addr", "http://"+srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
