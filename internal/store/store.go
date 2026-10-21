package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

type User struct {
	ID           uuid.UUID
	Email        string
	DisplayName  string
	StartedOn    time.Time
	BaselineNote string
	FollowupNote string
}

type Log struct {
	Date      string `json:"date"`
	Completed bool   `json:"completed"`
	Minutes   int    `json:"minutes"`
	Warmup    bool   `json:"warmup"`
	Technique bool   `json:"technique"`
	Musical   bool   `json:"musical"`
	Creative  bool   `json:"creative"`
	Notes     string `json:"notes"`
	Guitar    string `json:"guitar"`
}

type SongState struct {
	Status string
	Notes  string
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (User, string, error) {
	var user User
	var started string
	var hash string
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, display_name, to_char(started_on, 'YYYY-MM-DD'), baseline_note, followup_note
		FROM users
		WHERE email = $1`, email).Scan(&user.ID, &user.Email, &hash, &user.DisplayName, &started, &user.BaselineNote, &user.FollowupNote)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrNotFound
	}
	if err != nil {
		return User{}, "", err
	}
	user.StartedOn, err = parseDate(started)
	if err != nil {
		return User{}, "", err
	}
	return user, hash, nil
}

func (s *Store) UserByToken(ctx context.Context, tokenHash []byte) (User, error) {
	var user User
	var started string
	err := s.pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.display_name, to_char(u.started_on, 'YYYY-MM-DD'), u.baseline_note, u.followup_note
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`, tokenHash).Scan(
		&user.ID, &user.Email, &user.DisplayName, &started, &user.BaselineNote, &user.FollowupNote)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, err
	}
	user.StartedOn, err = parseDate(started)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Store) CreateSession(ctx context.Context, userID uuid.UUID, tokenHash []byte, expires time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sessions (token_hash, user_id, expires_at)
		VALUES ($1, $2, $3)`, tokenHash, userID, expires)
	return err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash []byte) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

func (s *Store) SetStartedOn(ctx context.Context, userID uuid.UUID, startedOn string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE users SET started_on = $2::date WHERE id = $1`, userID, startedOn)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetRecordings(ctx context.Context, userID uuid.UUID, baseline, followup string) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE users SET baseline_note = $2, followup_note = $3 WHERE id = $1`, userID, baseline, followup)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func parseDate(s string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.UTC)
	if err != nil {
		return time.Time{}, fmt.Errorf("date %q: %w", s, err)
	}
	return t, nil
}
