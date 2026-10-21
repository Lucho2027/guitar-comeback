CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    started_on date NOT NULL,
    baseline_note text NOT NULL DEFAULT '',
    followup_note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash bytea PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_days (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    practiced_on date NOT NULL,
    minutes int NOT NULL CHECK (minutes >= 0 AND minutes <= 180),
    completed boolean NOT NULL,
    warmup boolean NOT NULL,
    technique boolean NOT NULL,
    musical boolean NOT NULL,
    creative boolean NOT NULL,
    notes text NOT NULL DEFAULT '',
    guitar text NOT NULL DEFAULT '',
    PRIMARY KEY (user_id, practiced_on)
);

CREATE TABLE IF NOT EXISTS tempo (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bpm int NOT NULL DEFAULT 70 CHECK (bpm >= 40 AND bpm <= 220),
    clean_reps int NOT NULL DEFAULT 0 CHECK (clean_reps >= 0 AND clean_reps <= 3),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS song_progress (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    song_key text NOT NULL,
    status text NOT NULL CHECK (status IN ('not_started', 'learning', 'in_rotation', 'recorded')),
    notes text NOT NULL DEFAULT '',
    PRIMARY KEY (user_id, song_key)
);

CREATE TABLE IF NOT EXISTS preset_checks (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    preset_key text NOT NULL,
    dialed_in boolean NOT NULL,
    PRIMARY KEY (user_id, preset_key)
);
