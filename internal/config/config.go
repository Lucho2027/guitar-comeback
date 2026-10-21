package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	Port         string
	SeedEmail    string
	SeedPassword string
	SeedName     string
}

func Load() (Config, error) {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		return Config{}, fmt.Errorf("load .env: %w", err)
	}

	cfg := Config{
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		Port:         getenv("PORT", "8090"),
		SeedEmail:    getenv("SEED_EMAIL", "lucho@local"),
		SeedPassword: getenv("SEED_PASSWORD", "comeback"),
		SeedName:     getenv("SEED_NAME", "Lucho"),
	}
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	cfg.DatabaseURL = strings.TrimSpace(cfg.DatabaseURL)
	cfg.Port = strings.TrimSpace(cfg.Port)
	cfg.SeedEmail = strings.ToLower(strings.TrimSpace(cfg.SeedEmail))
	cfg.SeedName = strings.TrimSpace(cfg.SeedName)
	if cfg.Port == "" || cfg.SeedEmail == "" || cfg.SeedPassword == "" || cfg.SeedName == "" {
		return Config{}, errors.New("PORT, SEED_EMAIL, SEED_PASSWORD, and SEED_NAME are required")
	}
	return cfg, nil
}

func (c Config) Addr() string {
	return net.JoinHostPort("127.0.0.1", c.Port)
}

func getenv(key, fallback string) string {
	v, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(v) == "" {
		return fallback
	}
	return v
}
