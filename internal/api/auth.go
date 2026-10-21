package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/lucho2027/guitar-comeback/internal/auth"
	"github.com/lucho2027/guitar-comeback/internal/plan"
	"github.com/lucho2027/guitar-comeback/internal/store"
)

type ctxKey int

const userKey ctxKey = 1

type userJSON struct {
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	StartedOn   string `json:"started_on"`
}

func (s *server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := s.authenticate(w, r)
		if !ok {
			return
		}
		ctx := context.WithValue(r.Context(), userKey, user)
		next(w, r.WithContext(ctx))
	}
}

func currentUser(r *http.Request) store.User {
	user, _ := r.Context().Value(userKey).(store.User)
	return user
}

func (s *server) authenticate(w http.ResponseWriter, r *http.Request) (store.User, bool) {
	cookie, err := r.Cookie(auth.CookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "sign in required")
		return store.User{}, false
	}
	hash, err := auth.HashCookieToken(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sign in required")
		return store.User{}, false
	}
	user, err := s.store.UserByToken(r.Context(), hash)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "sign in required")
		return store.User{}, false
	}
	if err != nil {
		s.internal(w, err)
		return store.User{}, false
	}
	return user, true
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	user, hash, err := s.store.FindUserByEmail(r.Context(), email)
	if errors.Is(err, store.ErrNotFound) || (err == nil && !auth.CheckPassword(hash, body.Password)) {
		writeError(w, http.StatusUnauthorized, "email or password is incorrect")
		return
	}
	if err != nil {
		s.internal(w, err)
		return
	}
	value, tokenHash, err := auth.NewSessionToken()
	if err != nil {
		s.internal(w, err)
		return
	}
	expires := time.Now().Add(auth.SessionTTL)
	if err := s.store.CreateSession(r.Context(), user.ID, tokenHash, expires); err != nil {
		s.internal(w, err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
		MaxAge:   int(auth.SessionTTL.Seconds()),
		Expires:  expires,
	})
	writeJSON(w, http.StatusOK, toUserJSON(user))
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(auth.CookieName)
	if err == nil {
		if hash, hashErr := auth.HashCookieToken(cookie.Value); hashErr == nil {
			if err := s.store.DeleteSession(r.Context(), hash); err != nil {
				s.internal(w, err)
				return
			}
		}
	}
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toUserJSON(currentUser(r)))
}

func toUserJSON(user store.User) userJSON {
	return userJSON{
		Email:       user.Email,
		DisplayName: user.DisplayName,
		StartedOn:   plan.FormatDate(user.StartedOn),
	}
}
