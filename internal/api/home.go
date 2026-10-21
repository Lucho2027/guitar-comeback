package api

import (
	"net/http"

	"github.com/lucho2027/guitar-comeback/internal/plan"
	"github.com/lucho2027/guitar-comeback/internal/store"
)

type homeResponse struct {
	Today         string             `json:"today"`
	Week          int                `json:"week"`
	PlanComplete  bool               `json:"plan_complete"`
	NotStarted    bool               `json:"not_started"`
	StartedOn     string             `json:"started_on"`
	Phase         plan.Phase         `json:"phase"`
	Day           plan.ScheduledDay  `json:"day"`
	Routine       []plan.RoutineItem `json:"routine"`
	Log           *store.Log         `json:"log"`
	WeekDays      []plan.HomeDay     `json:"week_days"`
	MainDone      int                `json:"main_done"`
	MainTarget    int                `json:"main_target"`
	MinutesDone   int                `json:"minutes_done"`
	MinutesTarget int                `json:"minutes_target"`
	Tempo         plan.Tempo         `json:"tempo"`
	BaselineNote  string             `json:"baseline_note"`
	FollowupNote  string             `json:"followup_note"`
}

func (s *server) home(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	today := plan.Today()
	status := plan.Progress(user.StartedOn, today)
	start, end := plan.WeekContaining(today)
	logs, err := s.store.PracticeLogs(r.Context(), user.ID, plan.FormatDate(start), plan.FormatDate(end))
	if err != nil {
		s.internal(w, err)
		return
	}
	days := plan.BuildHomeDays(today, bitsFrom(logs))
	bpm, reps, err := s.store.GetTempo(r.Context(), user.ID)
	if err != nil {
		s.internal(w, err)
		return
	}
	todayStr := plan.FormatDate(today)
	var dayLog *store.Log
	if log, ok := logs[todayStr]; ok {
		dayLog = &log
	}
	commitment := plan.PlanCommitment()
	writeJSON(w, http.StatusOK, homeResponse{
		Today:         todayStr,
		Week:          status.Week,
		PlanComplete:  status.PlanComplete,
		NotStarted:    status.NotStarted,
		StartedOn:     plan.FormatDate(user.StartedOn),
		Phase:         plan.CurrentPhase(status.Week),
		Day:           plan.DaySchedule(today),
		Routine:       plan.Routine(),
		Log:           dayLog,
		WeekDays:      days,
		MainDone:      plan.MainDone(days),
		MainTarget:    commitment.SessionsPerWeek,
		MinutesDone:   plan.MinutesDone(days),
		MinutesTarget: commitment.WeeklyMinutes,
		Tempo:         plan.NewTempo(bpm, reps, false),
		BaselineNote:  user.BaselineNote,
		FollowupNote:  user.FollowupNote,
	})
}

func bitsFrom(logs map[string]store.Log) map[string]plan.LogBits {
	out := make(map[string]plan.LogBits, len(logs))
	for date, log := range logs {
		out[date] = plan.LogBits{Completed: log.Completed, Minutes: log.Minutes}
	}
	return out
}
