package plan

import "fmt"

const (
	TempoStep = 5
	TempoMin  = 40
	TempoMax  = 220
)

type Tempo struct {
	BPM                 int    `json:"bpm"`
	CleanReps           int    `json:"clean_reps"`
	SixteenthsPerMinute int    `json:"sixteenths_per_minute"`
	Step                int    `json:"step"`
	MinBPM              int    `json:"min_bpm"`
	MaxBPM              int    `json:"max_bpm"`
	ReadyToIncrease     bool   `json:"ready_to_increase"`
	Note                string `json:"note,omitempty"`
}

func SixteenthsPerMinute(bpm int) int {
	return bpm * 4
}

func ValidBPM(bpm int) bool {
	return bpm >= TempoMin && bpm <= TempoMax
}

func BumpBPM(bpm int) int {
	bpm += TempoStep
	if bpm > TempoMax {
		return TempoMax
	}
	return bpm
}

func EaseBPM(bpm int) int {
	return EaseBy(bpm, TempoStep)
}

func EaseBy(bpm, delta int) int {
	bpm -= delta
	if bpm < TempoMin {
		return TempoMin
	}
	return bpm
}

func IncCleanReps(reps int) int {
	if reps >= 3 {
		return 3
	}
	if reps < 0 {
		return 1
	}
	return reps + 1
}

func TempoNote(bpm int) string {
	return fmt.Sprintf("At %d BPM, sixteenth notes mean %d evenly spaced picked notes per minute. Start with short bursts, then build toward 20\u201330 seconds of relaxed, accurate playing. Increase by 5 BPM after three clean repetitions. If you tense up or make repeated mistakes, reduce the tempo. This is a tempo planner, not an audible metronome.", bpm, SixteenthsPerMinute(bpm))
}

func NewTempo(bpm, cleanReps int, withNote bool) Tempo {
	t := Tempo{
		BPM:                 bpm,
		CleanReps:           cleanReps,
		SixteenthsPerMinute: SixteenthsPerMinute(bpm),
		Step:                TempoStep,
		MinBPM:              TempoMin,
		MaxBPM:              TempoMax,
		ReadyToIncrease:     cleanReps == 3,
	}
	if withNote {
		t.Note = TempoNote(bpm)
	}
	return t
}
