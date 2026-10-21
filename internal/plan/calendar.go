package plan

import "time"

type LogBits struct {
	Completed bool
	Minutes   int
}

type HomeDay struct {
	Date      string `json:"date"`
	Weekday   string `json:"weekday"`
	Kind      string `json:"kind"`
	Focus     string `json:"focus"`
	Guitar    string `json:"guitar"`
	Completed bool   `json:"completed"`
	Minutes   int    `json:"minutes"`
	IsToday   bool   `json:"is_today"`
	IsFuture  bool   `json:"is_future"`
}

type PlanDay struct {
	Date      string `json:"date"`
	Weekday   string `json:"weekday"`
	Kind      string `json:"kind"`
	Completed bool   `json:"completed"`
	IsToday   bool   `json:"is_today"`
	IsFuture  bool   `json:"is_future"`
}

type PlanWeek struct {
	Number  int       `json:"number"`
	Start   string    `json:"start"`
	End     string    `json:"end"`
	Current bool      `json:"current"`
	Days    []PlanDay `json:"days"`
}

func BuildHomeDays(today time.Time, logs map[string]LogBits) []HomeDay {
	today = normalize(today)
	start := MondayOnOrBefore(today)
	days := make([]HomeDay, 7)
	for i := 0; i < 7; i++ {
		day := start.AddDate(0, 0, i)
		ds := FormatDate(day)
		sched := DaySchedule(day)
		var completed bool
		var minutes int
		if logs != nil {
			if bit, ok := logs[ds]; ok {
				completed = bit.Completed
				minutes = bit.Minutes
			}
		}
		days[i] = HomeDay{
			Date:      ds,
			Weekday:   ShortWeekday(day),
			Kind:      sched.Kind,
			Focus:     sched.Focus,
			Guitar:    sched.Guitar,
			Completed: completed,
			Minutes:   minutes,
			IsToday:   day.Equal(today),
			IsFuture:  day.After(today),
		}
	}
	return days
}

func MainDone(days []HomeDay) int {
	n := 0
	for _, day := range days {
		if day.Kind == KindMain && day.Completed {
			n++
		}
	}
	return n
}

func MinutesDone(days []HomeDay) int {
	n := 0
	for _, day := range days {
		n += day.Minutes
	}
	return n
}

// BuildPlanWeeks returns the eight Monday–Sunday weeks that begin on the
// Monday on or before startedOn. A week is current only when today falls
// inside it.
func BuildPlanWeeks(startedOn, today time.Time, logs map[string]LogBits) []PlanWeek {
	startMonday := MondayOnOrBefore(startedOn)
	today = normalize(today)
	weeks := make([]PlanWeek, 8)
	for n := 1; n <= 8; n++ {
		start := startMonday.AddDate(0, 0, (n-1)*7)
		end := start.AddDate(0, 0, 6)
		days := make([]PlanDay, 7)
		for i := 0; i < 7; i++ {
			day := start.AddDate(0, 0, i)
			ds := FormatDate(day)
			var completed bool
			if logs != nil {
				completed = logs[ds].Completed
			}
			days[i] = PlanDay{
				Date:      ds,
				Weekday:   ShortWeekday(day),
				Kind:      DaySchedule(day).Kind,
				Completed: completed,
				IsToday:   day.Equal(today),
				IsFuture:  day.After(today),
			}
		}
		weeks[n-1] = PlanWeek{
			Number:  n,
			Start:   FormatDate(start),
			End:     FormatDate(end),
			Current: !today.Before(start) && !today.After(end),
			Days:    days,
		}
	}
	return weeks
}
