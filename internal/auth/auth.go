package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const SessionTTL = 30 * 24 * time.Hour

// CookieName is "session" unless SESSION_COOKIE is set. Factory previews run one
// API per branch on the same host, and cookies ignore ports, so each gets its own name.
var CookieName = cookieName()

func cookieName() string {
	if v := strings.TrimSpace(os.Getenv("SESSION_COOKIE")); v != "" {
		return v
	}
	return "session"
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// NewSessionToken returns the hex cookie value and the sha256 of the raw 32 bytes.
func NewSessionToken() (cookieValue string, tokenHash []byte, err error) {
	raw := make([]byte, 32)
	if _, err = rand.Read(raw); err != nil {
		return "", nil, err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(raw), append([]byte(nil), sum[:]...), nil
}

func HashCookieToken(value string) ([]byte, error) {
	if len(value) != 64 {
		return nil, errors.New("invalid session")
	}
	raw, err := hex.DecodeString(value)
	if err != nil || len(raw) != 32 {
		return nil, errors.New("invalid session")
	}
	sum := sha256.Sum256(raw)
	return append([]byte(nil), sum[:]...), nil
}
