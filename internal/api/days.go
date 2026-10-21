package api

import (
	"net/http"
	"time"
	"unicode/utf8"

	"github.com/lucho2027/guitar-comeback/internal/plan"
	"github.com/lucho2027/guitar-comeback/internal/store"
)

func (s *server) putDay(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	date, ok := practiceDate(w, user, r.PathValue("date"))
	if !ok {
		return
	}
	var body struct {
		Completed bool   `json:"completed"`
		Minutes   int    `json:"minutes"`
		Warmup    bool   `json:"warmup"`
		Technique bool   `json:"technique"`
		Musical   bool   `json:"musical"`
		Creative  bool   `json:"creative"`
		Notes     string `json:"notes"`
		Guitar    string `json:"guitar"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Minutes < 0 || body.Minutes > 180 {
		writeError(w, http.StatusBadRequest, "minutes must be between 0 and 180")
		return
	}
	if utf8.RuneCountInString(body.Notes) > 4000 {
		writeError(w, http.StatusBadRequest, "notes must be at most 4000 characters")
		return
	}
	if utf8.RuneCountInString(body.Guitar) > 80 {
		writeError(w, http.StatusBadRequest, "guitar must be at most 80 characters")
		return
	}
	if hasNUL(body.Notes, body.Guitar) {
		writeError(w, http.StatusBadRequest, "invalid text")
		return
	}
	dayLog := store.Log{
		Date:      plan.FormatDate(date),
		Completed: body.Completed,
		Minutes:   body.Minutes,
		Warmup:    body.Warmup,
		Technique: body.Technique,
		Musical:   body.Musical,
		Creative:  body.Creative,
		Notes:     body.Notes,
		Guitar:    body.Guitar,
	}
	if err := s.store.SavePracticeDay(r.Context(), user.ID, dayLog); err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dayLog)
}

func (s *server) toggleDay(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	date, ok := practiceDate(w, user, r.PathValue("date"))
	if !ok {
		return
	}
	kind := plan.DaySchedule(date).Kind
	dayLog, err := s.store.TogglePracticeDay(r.Context(), user.ID, plan.FormatDate(date), plan.DefaultMinutes(kind))
	if err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dayLog)
}

func practiceDate(w http.ResponseWriter, user store.User, raw string) (time.Time, bool) {
	date, err := plan.ParseDate(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date")
		return time.Time{}, false
	}
	today := plan.Today()
	if date.After(today) {
		writeError(w, http.StatusBadRequest, "that day has not happened yet")
		return time.Time{}, false
	}
	startMonday := plan.MondayOnOrBefore(user.StartedOn)
	if date.Before(startMonday) {
		writeError(w, http.StatusBadRequest, "that day is before the plan starts")
		return time.Time{}, false
	}
	return date, true
}
