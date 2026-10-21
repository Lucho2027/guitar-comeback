package plan

import (
	"testing"
	"time"
)

func TestWednesdayOct21IsWeekOne(t *testing.T) {
	start := Date(2026, time.October, 19)
	today := Date(2026, time.October, 21)
	st := Progress(start, today)
	if st.Week != 1 || st.PlanComplete || st.NotStarted {
		t.Fatalf("status = %+v", st)
	}
	day := DaySchedule(today)
	if day.Weekday != "Wednesday" || day.Focus != "Rhythm and metal technique" || day.Guitar != "Sterling JP150" || day.Kind != KindMain {
		t.Fatalf("day = %+v", day)
	}
	if ShortWeekday(today) != "Wed" {
		t.Fatalf("short weekday %q", ShortWeekday(today))
	}
}

func TestBeforeStartIsNotStarted(t *testing.T) {
	start := Date(2026, time.October, 19)
	today := Date(2026, time.October, 18)
	st := Progress(start, today)
	if st.Week != 1 || !st.NotStarted || st.PlanComplete {
		t.Fatalf("status = %+v", st)
	}
}

func TestEighthSundayIsStillWeekEight(t *testing.T) {
	start := Date(2026, time.October, 19)
	sunday := Date(2026, time.December, 13)
	if FormatDate(start.AddDate(0, 0, 55)) != "2026-12-13" {
		t.Fatalf("eighth sunday shifted")
	}
	st := Progress(start, sunday)
	if st.Week != 8 || st.PlanComplete || st.NotStarted {
		t.Fatalf("status = %+v", st)
	}
}

func TestDec14IsPlanCompleteWeek8(t *testing.T) {
	start := Date(2026, time.October, 19)
	today := Date(2026, time.December, 14)
	st := Progress(start, today)
	if st.Week != 8 || !st.PlanComplete || st.NotStarted {
		t.Fatalf("status = %+v", st)
	}
	weeks := BuildPlanWeeks(start, today, nil)
	if len(weeks) != 8 {
		t.Fatalf("weeks %d", len(weeks))
	}
	if weeks[0].Start != "2026-10-19" || weeks[0].End != "2026-10-25" {
		t.Fatalf("week 1 %+v", weeks[0])
	}
	if weeks[7].Start != "2026-12-07" || weeks[7].End != "2026-12-13" {
		t.Fatalf("week 8 %+v", weeks[7])
	}
	for _, week := range weeks {
		if week.Current {
			t.Fatalf("week %d still current after the plan", week.Number)
		}
	}
}

func TestMondaySnapOfWednesday(t *testing.T) {
	wed := Date(2026, time.October, 21)
	got := MondayOnOrBefore(wed)
	want := Date(2026, time.October, 19)
	if !got.Equal(want) {
		t.Fatalf("got %s want %s", FormatDate(got), FormatDate(want))
	}
	if !MondayOnOrBefore(want).Equal(want) {
		t.Fatal("monday snap moved a monday")
	}
	sunday := Date(2026, time.October, 18)
	if !MondayOnOrBefore(sunday).Equal(Date(2026, time.October, 12)) {
		t.Fatalf("sunday snap %s", FormatDate(MondayOnOrBefore(sunday)))
	}
}

func TestUnsnappedStartStillUsesMonday(t *testing.T) {
	st := Progress(Date(2026, time.October, 21), Date(2026, time.October, 21))
	if st.Week != 1 || st.NotStarted || st.PlanComplete {
		t.Fatalf("status = %+v", st)
	}
}

func TestSixteenthsAt70(t *testing.T) {
	if SixteenthsPerMinute(70) != 280 {
		t.Fatalf("got %d", SixteenthsPerMinute(70))
	}
	tempo := NewTempo(70, 0, true)
	if tempo.SixteenthsPerMinute != 280 || tempo.ReadyToIncrease || tempo.Step != 5 || tempo.MinBPM != 40 || tempo.MaxBPM != 220 {
		t.Fatalf("%+v", tempo)
	}
	want := "At 70 BPM, sixteenth notes mean 280 evenly spaced picked notes per minute. Start with short bursts, then build toward 20\u201330 seconds of relaxed, accurate playing. Increase by 5 BPM after three clean repetitions. If you tense up or make repeated mistakes, reduce the tempo. This is a tempo planner, not an audible metronome."
	if tempo.Note != want {
		t.Fatalf("note = %q", tempo.Note)
	}
	if NewTempo(70, 3, false).ReadyToIncrease != true {
		t.Fatal("three clean reps should be ready")
	}
	if NewTempo(70, 3, false).Note != "" {
		t.Fatal("home tempo includes a note")
	}
}

func TestSpringForwardWeekStaysSevenDays(t *testing.T) {
	start := Date(2026, time.March, 2)
	today := Date(2026, time.March, 9)
	if start.Weekday() != time.Monday || today.Weekday() != time.Monday {
		t.Fatalf("fixture weekdays %s %s", start.Weekday(), today.Weekday())
	}
	if days := int(today.Sub(start) / (24 * time.Hour)); days != 7 {
		t.Fatalf("civil days = %d", days)
	}
	st := Progress(start, today)
	if st.Week != 2 || st.NotStarted || st.PlanComplete {
		t.Fatalf("status = %+v", st)
	}
}

func TestHomeWeekOfOct21(t *testing.T) {
	today := Date(2026, time.October, 21)
	logs := map[string]LogBits{
		"2026-10-21": {Completed: true, Minutes: 30},
		"2026-10-19": {Completed: true, Minutes: 20},
	}
	days := BuildHomeDays(today, logs)
	if len(days) != 7 {
		t.Fatalf("len %d", len(days))
	}
	wantShort := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	for i, short := range wantShort {
		if days[i].Weekday != short {
			t.Fatalf("day %d weekday %s", i, days[i].Weekday)
		}
	}
	if days[0].Date != "2026-10-19" || days[6].Date != "2026-10-25" {
		t.Fatalf("span %s %s", days[0].Date, days[6].Date)
	}
	wed := days[2]
	if !wed.IsToday || wed.IsFuture || wed.Kind != KindMain || wed.Focus != "Rhythm and metal technique" || wed.Guitar != "Sterling JP150" || !wed.Completed || wed.Minutes != 30 {
		t.Fatalf("wednesday %+v", wed)
	}
	if days[3].Kind != KindLight || !days[3].IsFuture || days[3].Weekday != "Thu" {
		t.Fatalf("thursday %+v", days[3])
	}
	if days[6].Kind != KindRest || days[6].Guitar != "\u2014" {
		t.Fatalf("sunday %+v", days[6])
	}
	if MainDone(days) != 2 || MinutesDone(days) != 50 {
		t.Fatalf("main %d minutes %d", MainDone(days), MinutesDone(days))
	}
	weeks := BuildPlanWeeks(Date(2026, time.October, 19), today, logs)
	if !weeks[0].Current || weeks[1].Current {
		t.Fatal("week 1 should be the only current week")
	}
	if !weeks[0].Days[2].IsToday || !weeks[0].Days[2].Completed {
		t.Fatalf("plan wednesday %+v", weeks[0].Days[2])
	}
}

func TestSongBlocksAndPresets(t *testing.T) {
	states := map[string]SongState{
		"slow-dancing": {Status: StatusLearning, Notes: "verse"},
	}
	songs := Songs(1, false, states)
	if len(songs) != 4 {
		t.Fatalf("songs %d", len(songs))
	}
	if songs[0].Key != "yellow-ledbetter" || !songs[0].InCurrentBlock || songs[0].Status != StatusNotStarted || songs[0].Notes != "" {
		t.Fatalf("yellow %+v", songs[0])
	}
	if songs[1].InCurrentBlock || songs[2].InCurrentBlock || songs[3].InCurrentBlock {
		t.Fatal("later songs are in the week 1 block")
	}
	notStarted := Songs(1, true, nil)
	for _, song := range notStarted {
		if song.InCurrentBlock {
			t.Fatalf("%s in block before the plan", song.Key)
		}
	}
	week4 := Songs(4, false, states)
	if !week4[1].InCurrentBlock || week4[1].Status != StatusLearning || week4[1].Notes != "verse" || !week4[2].InCurrentBlock {
		t.Fatal("week 4 block")
	}
	week8 := Songs(8, false, nil)
	if week8[2].Key != "cliffs-of-dover" || !week8[2].InCurrentBlock || week8[3].Key != "my-curse" || !week8[3].InCurrentBlock {
		t.Fatal("week 8 block")
	}
	if _, ok := ProjectSong("nope", 1, false, SongState{}); ok {
		t.Fatal("unknown song")
	}
	presets := Presets(map[string]bool{"mayer-clean": true})
	if len(presets) != 4 || !presets[0].DialedIn || presets[1].DialedIn {
		t.Fatalf("presets %+v", presets)
	}
	if _, ok := ProjectPreset("nope", true); ok {
		t.Fatal("unknown preset")
	}
	phase := CurrentPhase(1)
	if phase.ID != "foundation" || phase.WeeksLabel != "01\u201302" || !phase.Current {
		t.Fatalf("phase %+v", phase)
	}
	if DefaultMinutes(KindMain) != 30 || DefaultMinutes(KindLight) != 10 || DefaultMinutes(KindRest) != 0 {
		t.Fatal("default minutes")
	}
	if BumpBPM(220) != 220 || EaseBPM(40) != 40 || IncCleanReps(3) != 3 {
		t.Fatal("tempo bounds")
	}
	if len(Advice()) != 4 || len(Influences()) != 5 || len(Guitars()) != 3 || len(TheoryTopics()) != 3 || len(Routine()) != 4 || len(Schedule()) != 7 {
		t.Fatal("catalog size")
	}
}

func TestTodayUsesLocalCalendar(t *testing.T) {
	now := time.Now().In(time.Local)
	got := Today()
	y, m, d := now.Date()
	if got.Year() != y || got.Month() != m || got.Day() != d || got.Location() != time.UTC {
		t.Fatalf("today %s local %s", got, now)
	}
}
