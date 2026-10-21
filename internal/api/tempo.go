package api

import (
	"errors"
	"net/http"

	"github.com/lucho2027/guitar-comeback/internal/plan"
)

var errBPM = errors.New("bpm must be between 40 and 220")

func (s *server) getTempo(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	bpm, reps, err := s.store.GetTempo(r.Context(), user.ID)
	if err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, plan.NewTempo(bpm, reps, true))
}

func (s *server) postTempoClean(w http.ResponseWriter, r *http.Request) {
	s.changeTempo(w, r, func(bpm, reps int) (int, int, error) {
		return bpm, plan.IncCleanReps(reps), nil
	})
}

func (s *server) postTempoBump(w http.ResponseWriter, r *http.Request) {
	s.changeTempo(w, r, func(bpm, reps int) (int, int, error) {
		return plan.BumpBPM(bpm), 0, nil
	})
}

func (s *server) postTempoEase(w http.ResponseWriter, r *http.Request) {
	s.changeTempo(w, r, func(bpm, reps int) (int, int, error) {
		return plan.EaseBPM(bpm), 0, nil
	})
}

func (s *server) putTempo(w http.ResponseWriter, r *http.Request) {
	var body struct {
		BPM *int `json:"bpm"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	s.changeTempo(w, r, func(bpm, reps int) (int, int, error) {
		if body.BPM != nil {
			if !plan.ValidBPM(*body.BPM) {
				return 0, 0, errBPM
			}
			bpm = *body.BPM
		}
		return bpm, 0, nil
	})
}

func (s *server) changeTempo(w http.ResponseWriter, r *http.Request, fn func(bpm, reps int) (int, int, error)) {
	user := currentUser(r)
	bpm, reps, err := s.store.UpdateTempo(r.Context(), user.ID, fn)
	if errors.Is(err, errBPM) {
		writeError(w, http.StatusBadRequest, errBPM.Error())
		return
	}
	if err != nil {
		s.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, plan.NewTempo(bpm, reps, true))
}
