package store

import (
	"context"

	"github.com/google/uuid"
)

func (s *Store) SongStates(ctx context.Context, userID uuid.UUID) (map[string]SongState, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT song_key, status, notes FROM song_progress WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]SongState{}
	for rows.Next() {
		var key string
		var state SongState
		if err := rows.Scan(&key, &state.Status, &state.Notes); err != nil {
			return nil, err
		}
		out[key] = state
	}
	return out, rows.Err()
}

func (s *Store) SaveSong(ctx context.Context, userID uuid.UUID, key, status, notes string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO song_progress (user_id, song_key, status, notes)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, song_key) DO UPDATE SET
			status = EXCLUDED.status,
			notes = EXCLUDED.notes`, userID, key, status, notes)
	return err
}

func (s *Store) PresetStates(ctx context.Context, userID uuid.UUID) (map[string]bool, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT preset_key, dialed_in FROM preset_checks WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var key string
		var dialed bool
		if err := rows.Scan(&key, &dialed); err != nil {
			return nil, err
		}
		out[key] = dialed
	}
	return out, rows.Err()
}

func (s *Store) SavePreset(ctx context.Context, userID uuid.UUID, key string, dialed bool) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO preset_checks (user_id, preset_key, dialed_in)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, preset_key) DO UPDATE SET
			dialed_in = EXCLUDED.dialed_in`, userID, key, dialed)
	return err
}

func (s *Store) GetTempo(ctx context.Context, userID uuid.UUID) (int, int, error) {
	if err := s.ensureTempo(ctx, userID); err != nil {
		return 0, 0, err
	}
	var bpm, reps int
	err := s.pool.QueryRow(ctx, `SELECT bpm, clean_reps FROM tempo WHERE user_id = $1`, userID).Scan(&bpm, &reps)
	return bpm, reps, err
}

func (s *Store) UpdateTempo(ctx context.Context, userID uuid.UUID, fn func(bpm, reps int) (int, int, error)) (int, int, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO tempo (user_id, bpm, clean_reps) VALUES ($1, 70, 0)
		ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return 0, 0, err
	}
	var bpm, reps int
	if err := tx.QueryRow(ctx, `
		SELECT bpm, clean_reps FROM tempo WHERE user_id = $1 FOR UPDATE`, userID).Scan(&bpm, &reps); err != nil {
		return 0, 0, err
	}
	bpm, reps, err = fn(bpm, reps)
	if err != nil {
		return 0, 0, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE tempo SET bpm = $2, clean_reps = $3, updated_at = now() WHERE user_id = $1`, userID, bpm, reps); err != nil {
		return 0, 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}
	return bpm, reps, nil
}

func (s *Store) ensureTempo(ctx context.Context, userID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO tempo (user_id, bpm, clean_reps) VALUES ($1, 70, 0)
		ON CONFLICT (user_id) DO NOTHING`, userID)
	return err
}
