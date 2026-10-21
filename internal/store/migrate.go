package store

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/lucho2027/guitar-comeback/internal/db"
)

func EnsureDatabase(ctx context.Context, databaseURL string) error {
	cfg, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("parse database url: %w", err)
	}
	name := cfg.Database
	if name == "" {
		return errors.New("DATABASE_URL is missing a database name")
	}
	if !simpleIdent(name) {
		return fmt.Errorf("unsupported database name %q", name)
	}
	cfg.Database = "postgres"
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect to postgres: %w", err)
	}
	defer conn.Close(ctx)

	var exists bool
	if err := conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)`, name).Scan(&exists); err != nil {
		return fmt.Errorf("check database: %w", err)
	}
	if exists {
		return nil
	}
	if err := execSimple(ctx, conn, `CREATE DATABASE `+name); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "42P04" {
			return nil
		}
		return fmt.Errorf("create database: %w", err)
	}
	slog.Info("created database", "name", name)
	return nil
}

func Migrate(ctx context.Context, databaseURL string) error {
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("migrate connect: %w", err)
	}
	defer conn.Close(ctx)

	if err := execSimple(ctx, conn, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("schema_migrations: %w", err)
	}

	var applied bool
	if err := conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`, "001_init").Scan(&applied); err != nil {
		return fmt.Errorf("migration status: %w", err)
	}
	if applied {
		slog.Info("migrations up to date")
		return nil
	}

	if err := execSimple(ctx, conn, db.InitSQL); err != nil {
		return fmt.Errorf("apply 001_init: %w", err)
	}
	if _, err := conn.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, "001_init"); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil
		}
		return fmt.Errorf("record migration: %w", err)
	}
	slog.Info("migration applied", "version", "001_init")
	return nil
}

func execSimple(ctx context.Context, conn *pgx.Conn, sql string) error {
	return conn.PgConn().Exec(ctx, sql).Close()
}

func simpleIdent(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			continue
		}
		return false
	}
	return true
}
