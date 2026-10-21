package db

import _ "embed"

// InitSQL is the initial schema. Apply it with the simple query protocol so
// PostgreSQL accepts every statement in one script.
//
//go:embed migrations/001_init.sql
var InitSQL string
