package store

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lucho2027/guitar-comeback/internal/auth"
)

func Seed(ctx context.Context, pool *pgxpool.Pool, email, password, name, startedOn string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var n int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		slog.Info("users already present, skipping seed")
		return nil
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	id := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, display_name, started_on)
		VALUES ($1, $2, $3, $4, $5::date)`, id, email, hash, name, startedOn)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil
		}
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO tempo (user_id, bpm, clean_reps) VALUES ($1, 70, 0)`, id); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	slog.Info("seeded user", "email", email, "started_on", startedOn)
	return nil
}
