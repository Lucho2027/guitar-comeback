package plan

import "time"

// Civil dates are stored as UTC midnight instants. Week arithmetic uses those
// instants so a DST transition cannot shrink or stretch a civil day.

func Date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func Today() time.Time {
	now := time.Now().In(time.Local)
	y, m, d := now.Date()
	return Date(y, m, d)
}

func ParseDate(s string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.UTC)
	if err != nil {
		return time.Time{}, err
	}
	return t, nil
}

func FormatDate(t time.Time) string {
	return normalize(t).Format("2006-01-02")
}

func normalize(t time.Time) time.Time {
	y, m, d := t.In(time.UTC).Date()
	return Date(y, m, d)
}

// MondayOnOrBefore returns the Monday of the civil week that contains day.
func MondayOnOrBefore(day time.Time) time.Time {
	day = normalize(day)
	offset := (int(day.Weekday()) + 6) % 7
	return day.AddDate(0, 0, -offset)
}

func WeekContaining(day time.Time) (start, end time.Time) {
	start = MondayOnOrBefore(day)
	end = start.AddDate(0, 0, 6)
	return start, end
}

type Status struct {
	Week         int
	PlanComplete bool
	NotStarted   bool
}

// Progress reports the 8-week plan position of today relative to startedOn.
// The plan start snaps to the Monday on or before startedOn. Week 1 is that
// Monday through Sunday. Before that Monday, NotStarted is set and Week is 1.
// After the eighth Sunday, PlanComplete is set and Week stays 8.
func Progress(startedOn, today time.Time) Status {
	start := MondayOnOrBefore(startedOn)
	today = normalize(today)
	if today.Before(start) {
		return Status{Week: 1, NotStarted: true}
	}
	days := int(today.Sub(start) / (24 * time.Hour))
	week := days/7 + 1
	if week > 8 {
		return Status{Week: 8, PlanComplete: true}
	}
	return Status{Week: week}
}

func DaysApart(a, b time.Time) int {
	n := int(normalize(b).Sub(normalize(a)) / (24 * time.Hour))
	if n < 0 {
		return -n
	}
	return n
}
