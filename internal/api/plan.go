package api

import (
	"net/http"
	"unicode/utf8"

	"github.com/lucho2027/guitar-comeback/internal/plan"
	"github.com/lucho2027/guitar-comeback/internal/store"
)

type planResponse struct {
	StartedOn    string              `json:"started_on"`
	Today        string              `json:"today"`
	Week         int                 `json:"week"`
	PlanComplete bool                `json:"plan_complete"`
	NotStarted   bool                `json:"not_started"`
	Commitment   plan.Commitment     `json:"commitment"`
	Advice       []string            `json:"advice"`
	Influences   []plan.Influence    `json:"influences"`
	Guitars      []plan.Guitar       `json:"guitars"`
	Schedule     []plan.ScheduledDay `json:"schedule"`
	Phases       []plan.Phase        `json:"phases"`
	Theory       []plan.Theory       `json:"theory"`
	Songs        []plan.Song         `json:"songs"`
	Presets      []plan.Preset       `json:"presets"`
	BaselineNote string              `json:"baseline_note"`
	FollowupNote string              `json:"followup_note"`
	Weeks        []plan.PlanWeek     `json:"weeks"`
}

func (s *server) getPlan(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	today := plan.Today()
	status := plan.Progress(user.StartedOn, today)
	startMonday := plan.MondayOnOrBefore(user.StartedOn)
	end := startMonday.AddDate(0, 0, 8*7-1)
	logs, err := s.store.PracticeLogs(r.Context(), user.ID, plan.FormatDate(startMonday), plan.FormatDate(end))
	if err != nil {
		s.internal(w, err)
		return
	}
	songs, err := s.store.SongStates(r.Context(), user.ID)
	if err != nil {
		s.internal(w, err)
		return
	}
	presets, err := s.store.PresetStates(r.Context(), user.ID)
	if err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, planResponse{
		StartedOn:    plan.FormatDate(user.StartedOn),
		Today:        plan.FormatDate(today),
		Week:         status.Week,
		PlanComplete: status.PlanComplete,
		NotStarted:   status.NotStarted,
		Commitment:   plan.PlanCommitment(),
		Advice:       plan.Advice(),
		Influences:   plan.Influences(),
		Guitars:      plan.Guitars(),
		Schedule:     plan.Schedule(),
		Phases:       plan.PhasesFor(status.Week),
		Theory:       plan.TheoryTopics(),
		Songs:        plan.Songs(status.Week, status.NotStarted, toPlanSongs(songs)),
		Presets:      plan.Presets(presets),
		BaselineNote: user.BaselineNote,
		FollowupNote: user.FollowupNote,
		Weeks:        plan.BuildPlanWeeks(user.StartedOn, today, bitsFrom(logs)),
	})
}

func (s *server) putPlanStart(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	var body struct {
		StartedOn string `json:"started_on"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	date, err := plan.ParseDate(body.StartedOn)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date")
		return
	}
	today := plan.Today()
	if plan.DaysApart(today, date) > 400 {
		writeError(w, http.StatusBadRequest, "start date must be within 400 days of today")
		return
	}
	monday := plan.FormatDate(plan.MondayOnOrBefore(date))
	if err := s.store.SetStartedOn(r.Context(), user.ID, monday); err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"started_on": monday})
}

func (s *server) putSong(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	key := r.PathValue("key")
	if !plan.KnownSong(key) {
		writeError(w, http.StatusNotFound, "unknown song")
		return
	}
	var body struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if !plan.ValidSongStatus(body.Status) {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}
	if hasNUL(body.Notes) {
		writeError(w, http.StatusBadRequest, "invalid text")
		return
	}
	if err := s.store.SaveSong(r.Context(), user.ID, key, body.Status, body.Notes); err != nil {
		s.internal(w, err)
		return
	}
	status := plan.Progress(user.StartedOn, plan.Today())
	song, _ := plan.ProjectSong(key, status.Week, status.NotStarted, plan.SongState{Status: body.Status, Notes: body.Notes})
	writeJSON(w, http.StatusOK, song)
}

func (s *server) putPreset(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	key := r.PathValue("key")
	if !plan.KnownPreset(key) {
		writeError(w, http.StatusNotFound, "unknown preset")
		return
	}
	var body struct {
		DialedIn bool `json:"dialed_in"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if err := s.store.SavePreset(r.Context(), user.ID, key, body.DialedIn); err != nil {
		s.internal(w, err)
		return
	}
	preset, _ := plan.ProjectPreset(key, body.DialedIn)
	writeJSON(w, http.StatusOK, preset)
}

func (s *server) putRecordings(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	var body struct {
		BaselineNote string `json:"baseline_note"`
		FollowupNote string `json:"followup_note"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if utf8.RuneCountInString(body.BaselineNote) > 4000 {
		writeError(w, http.StatusBadRequest, "baseline_note must be at most 4000 characters")
		return
	}
	if utf8.RuneCountInString(body.FollowupNote) > 4000 {
		writeError(w, http.StatusBadRequest, "followup_note must be at most 4000 characters")
		return
	}
	if hasNUL(body.BaselineNote, body.FollowupNote) {
		writeError(w, http.StatusBadRequest, "invalid text")
		return
	}
	if err := s.store.SetRecordings(r.Context(), user.ID, body.BaselineNote, body.FollowupNote); err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"baseline_note": body.BaselineNote,
		"followup_note": body.FollowupNote,
	})
}

func toPlanSongs(in map[string]store.SongState) map[string]plan.SongState {
	out := make(map[string]plan.SongState, len(in))
	for key, state := range in {
		out[key] = plan.SongState{Status: state.Status, Notes: state.Notes}
	}
	return out
}
