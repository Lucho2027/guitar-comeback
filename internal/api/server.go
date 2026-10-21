package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/lucho2027/guitar-comeback/internal/store"
)

const maxBody = 1 << 20

type server struct {
	store *store.Store
}

func New(st *store.Store) http.Handler {
	s := &server{store: st}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("POST /api/auth/logout", s.requireAuth(s.logout))
	mux.HandleFunc("GET /api/auth/me", s.requireAuth(s.me))
	mux.HandleFunc("GET /api/home", s.requireAuth(s.home))
	mux.HandleFunc("PUT /api/days/{date}", s.requireAuth(s.putDay))
	mux.HandleFunc("POST /api/days/{date}/toggle", s.requireAuth(s.toggleDay))
	mux.HandleFunc("PUT /api/plan/start", s.requireAuth(s.putPlanStart))
	mux.HandleFunc("GET /api/plan", s.requireAuth(s.getPlan))
	mux.HandleFunc("PUT /api/songs/{key}", s.requireAuth(s.putSong))
	mux.HandleFunc("PUT /api/presets/{key}", s.requireAuth(s.putPreset))
	mux.HandleFunc("PUT /api/recordings", s.requireAuth(s.putRecordings))
	mux.HandleFunc("GET /api/tempo", s.requireAuth(s.getTempo))
	mux.HandleFunc("POST /api/tempo/clean", s.requireAuth(s.postTempoClean))
	mux.HandleFunc("POST /api/tempo/bump", s.requireAuth(s.postTempoBump))
	mux.HandleFunc("POST /api/tempo/ease", s.requireAuth(s.postTempoEase))
	mux.HandleFunc("PUT /api/tempo", s.requireAuth(s.putTempo))
	return s.recover(s.logRequests(limitBody(mux)))
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) internal(w http.ResponseWriter, err error) {
	slog.Error("request failed", "err", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		slog.Error("encode json", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		if isTooLarge(err) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return false
		}
		writeError(w, http.StatusBadRequest, "invalid json")
		return false
	}
	return true
}

func isTooLarge(err error) bool {
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) {
		return true
	}
	return strings.Contains(err.Error(), "request body too large")
}

func limitBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, maxBody)
		}
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func (s *server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", sw.status)
	})
}

func (s *server) recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic", "err", rec, "path", r.URL.Path)
				writeError(w, http.StatusInternalServerError, "internal error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func hasNUL(values ...string) bool {
	for _, v := range values {
		if strings.ContainsRune(v, 0) {
			return true
		}
	}
	return false
}
