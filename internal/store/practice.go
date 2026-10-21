package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Store) PracticeLogs(ctx context.Context, userID uuid.UUID, start, end string) (map[string]Log, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT to_char(practiced_on, 'YYYY-MM-DD'), minutes, completed, warmup, technique, musical, creative, notes, guitar
		FROM practice_days
		WHERE user_id = $1 AND practiced_on >= $2::date AND practiced_on <= $3::date`, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]Log{}
	for rows.Next() {
		var log Log
		if err := rows.Scan(&log.Date, &log.Minutes, &log.Completed, &log.Warmup, &log.Technique, &log.Musical, &log.Creative, &log.Notes, &log.Guitar); err != nil {
			return nil, err
		}
		out[log.Date] = log
	}
	return out, rows.Err()
}

func (s *Store) SavePracticeDay(ctx context.Context, userID uuid.UUID, log Log) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO practice_days (
			user_id, practiced_on, minutes, completed, warmup, technique, musical, creative, notes, guitar
		) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, practiced_on) DO UPDATE SET
			minutes = EXCLUDED.minutes,
			completed = EXCLUDED.completed,
			warmup = EXCLUDED.warmup,
			technique = EXCLUDED.technique,
			musical = EXCLUDED.musical,
			creative = EXCLUDED.creative,
			notes = EXCLUDED.notes,
			guitar = EXCLUDED.guitar`,
		userID, log.Date, log.Minutes, log.Completed, log.Warmup, log.Technique, log.Musical, log.Creative, log.Notes, log.Guitar)
	return err
}

func (s *Store) TogglePracticeDay(ctx context.Context, userID uuid.UUID, date string, minutesIfZero int) (Log, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Log{}, err
	}
	defer tx.Rollback(ctx)

	log := Log{Date: date}
	err = tx.QueryRow(ctx, `
		SELECT minutes, completed, warmup, technique, musical, creative, notes, guitar
		FROM practice_days
		WHERE user_id = $1 AND practiced_on = $2::date
		FOR UPDATE`, userID, date).Scan(
		&log.Minutes, &log.Completed, &log.Warmup, &log.Technique, &log.Musical, &log.Creative, &log.Notes, &log.Guitar)
	if errors.Is(err, pgx.ErrNoRows) {
		log = Log{Date: date}
	} else if err != nil {
		return Log{}, err
	}

	log.Completed = !log.Completed
	if log.Completed && log.Minutes == 0 {
		log.Minutes = minutesIfZero
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO practice_days (
			user_id, practiced_on, minutes, completed, warmup, technique, musical, creative, notes, guitar
		) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, practiced_on) DO UPDATE SET
			minutes = EXCLUDED.minutes,
			completed = EXCLUDED.completed,
			warmup = EXCLUDED.warmup,
			technique = EXCLUDED.technique,
			musical = EXCLUDED.musical,
			creative = EXCLUDED.creative,
			notes = EXCLUDED.notes,
			guitar = EXCLUDED.guitar`,
		userID, log.Date, log.Minutes, log.Completed, log.Warmup, log.Technique, log.Musical, log.Creative, log.Notes, log.Guitar); err != nil {
		return Log{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Log{}, err
	}
	return log, nil
}
