package plan

import "time"

const (
	KindMain  = "main"
	KindLight = "light"
	KindRest  = "rest"

	StatusNotStarted = "not_started"
	StatusLearning   = "learning"
	StatusInRotation = "in_rotation"
	StatusRecorded   = "recorded"
)

type ScheduledDay struct {
	Weekday string `json:"weekday"`
	Focus   string `json:"focus"`
	Guitar  string `json:"guitar"`
	Kind    string `json:"kind"`
}

type Phase struct {
	ID         string `json:"id"`
	Number     int    `json:"number"`
	WeeksLabel string `json:"weeks_label"`
	WeekStart  int    `json:"week_start"`
	WeekEnd    int    `json:"week_end"`
	Title      string `json:"title"`
	Summary    string `json:"summary"`
	Goal       string `json:"goal"`
	Current    bool   `json:"current"`
}

type RoutineItem struct {
	Key     string `json:"key"`
	Label   string `json:"label"`
	Minutes int    `json:"minutes"`
	Detail  string `json:"detail"`
}

type Influence struct {
	Name   string `json:"name"`
	Detail string `json:"detail"`
}

type Guitar struct {
	Name   string `json:"name"`
	Role   string `json:"role"`
	Detail string `json:"detail"`
}

type Theory struct {
	WeeksLabel string `json:"weeks_label"`
	Title      string `json:"title"`
	Detail     string `json:"detail"`
}

type Commitment struct {
	SessionsPerWeek int `json:"sessions_per_week"`
	LighterDays     int `json:"lighter_days"`
	SessionMinutes  int `json:"session_minutes"`
	WeeklyMinutes   int `json:"weekly_minutes"`
}

type SongState struct {
	Status string
	Notes  string
}

type Song struct {
	Key            string `json:"key"`
	Title          string `json:"title"`
	Artist         string `json:"artist"`
	WeeksLabel     string `json:"weeks_label"`
	WeekStart      int    `json:"week_start"`
	WeekEnd        int    `json:"week_end"`
	Guitar         string `json:"guitar"`
	Detail         string `json:"detail"`
	Status         string `json:"status"`
	Notes          string `json:"notes"`
	InCurrentBlock bool   `json:"in_current_block"`
}

type Preset struct {
	Key       string `json:"key"`
	Name      string `json:"name"`
	Guitar    string `json:"guitar"`
	Character string `json:"character"`
	DialedIn  bool   `json:"dialed_in"`
}

var schedule = []ScheduledDay{
	{Weekday: "Monday", Focus: "Blues leads and bending", Guitar: "Fender Strat", Kind: KindMain},
	{Weekday: "Tuesday", Focus: "Alternate picking and legato", Guitar: "Fender Strat", Kind: KindMain},
	{Weekday: "Wednesday", Focus: "Rhythm and metal technique", Guitar: "Sterling JP150", Kind: KindMain},
	{Weekday: "Thursday", Focus: "Rest or 10-minute fun session", Guitar: "Either", Kind: KindLight},
	{Weekday: "Friday", Focus: "Improvisation and music theory", Guitar: "Fender Strat", Kind: KindMain},
	{Weekday: "Saturday", Focus: "Song learning and recording", Guitar: "Either", Kind: KindMain},
	{Weekday: "Sunday", Focus: "Rest", Guitar: "\u2014", Kind: KindRest},
}

var phases = []Phase{
	{
		ID: "foundation", Number: 1, WeeksLabel: "01\u201302", WeekStart: 1, WeekEnd: 2,
		Title:   "Rebuild your foundation",
		Summary: "Concentrate on relaxed alternate picking, accurate bends, vibrato, timing, and pentatonic fluency. Record a short solo during the first week to establish your baseline.",
		Goal:    "Play cleanly with a metronome and regain confidence with familiar guitar phrases.",
	},
	{
		ID: "expression", Number: 2, WeeksLabel: "03\u201304", WeekStart: 3, WeekEnd: 4,
		Title:   "Develop expressive lead playing",
		Summary: "Work on major/minor pentatonic transitions, target notes, bends, legato, and expressive vibrato. Learn a John Mayer-inspired phrase and a manageable section of Cliffs of Dover.",
		Goal:    "Improvise a coherent one-minute solo over a blues backing track.",
	},
	{
		ID: "precision", Number: 3, WeeksLabel: "05\u201306", WeekStart: 5, WeekEnd: 6,
		Title:   "Build speed and rhythm precision",
		Summary: "Work on sixteenth-note alternate picking, palm muting, gallops, and transitions between heavy riffs and melodic leads. Start a Killswitch Engage riff slowly and increase the tempo only when it's clean.",
		Goal:    "Play a selected heavy riff with consistent timing and clear articulation.",
	},
	{
		ID: "performance", Number: 4, WeeksLabel: "07\u201308", WeekStart: 7, WeekEnd: 8,
		Title:   "Put everything together",
		Summary: "Work toward a complete performance of one manageable song, with additional sections from harder material. Record yourself using BIAS FX 2 and listen for timing, note clarity, phrasing, and tone.",
		Goal:    "Finish a complete song and record an improved version of your week-one solo.",
	},
}

var routine = []RoutineItem{
	{Key: "warmup", Label: "Warm-up", Minutes: 5, Detail: "Chromatic patterns, light alternate picking, and relaxed hands."},
	{Key: "technique", Label: "Technique", Minutes: 10, Detail: "Your assigned daily focus: bending, picking, legato, or rhythm."},
	{Key: "musical", Label: "Musical application", Minutes: 10, Detail: "Learn a song passage or apply the technique in a musical phrase."},
	{Key: "creative", Label: "Creative playing", Minutes: 5, Detail: "Improvise, record a lick, or play something you enjoy."},
}

var influences = []Influence{
	{Name: "John Mayer", Detail: "Blues phrasing, dynamics, chord embellishments, and expressive bending."},
	{Name: "Eric Johnson", Detail: "Alternate picking, legato, smooth melodic lines, and precision."},
	{Name: "Pearl Jam", Detail: "Rhythm guitar, melodic solos, and playing by feel."},
	{Name: "Killswitch Engage", Detail: "Tight palm muting, galloping rhythms, and synchronized picking."},
	{Name: "Soda Stereo", Detail: "Chord voicings, rhythmic textures, and melodic rock."},
}

var guitars = []Guitar{
	{Name: "American Standard Stratocaster", Role: "Blues, legato, and song work", Detail: "Your main guitar for Mayer, Johnson, and Pearl Jam days."},
	{Name: "Sterling JP150", Role: "Rhythm and metal", Detail: "Wednesday technique and My Curse. The studio track is in Drop C."},
	{Name: "HILS NEXT HN3", Role: "On the way", Detail: "When it arrives it can become your primary practice guitar. Aim to feel comfortable again, with two songs in rotation, by the time you want it as your 40th-birthday guitar."},
}

var advice = []string{
	"Don't worry about making up missed sessions. On a busy day, even 10 focused minutes count.",
	"For the first two weeks, prioritize consistency over speed. You're not starting from scratch. You're recovering familiarity with techniques you've already learned.",
	"By the time the HILS arrives, aim to have your basic technique feeling comfortable again and at least two songs in active rotation.",
	"Music theory and fretboard knowledge are the next layer. At the intermediate level, that can make a huge difference in improvisation.",
}

var theory = []Theory{
	{WeeksLabel: "01\u201302", Title: "Name the roots", Detail: "Learn minor pentatonic box 1 and find the root on the low E and A strings before you solo."},
	{WeeksLabel: "03\u201304", Title: "Aim at the changes", Detail: "Move between major and minor pentatonic, and land phrases on a chord tone."},
	{WeeksLabel: "05\u201308", Title: "Say the chord first", Detail: "Name the chord you are playing over before you start a phrase."},
}

var songDefs = []Song{
	{
		Key: "yellow-ledbetter", Title: "Yellow Ledbetter", Artist: "Pearl Jam",
		WeeksLabel: "1\u20132", WeekStart: 1, WeekEnd: 2, Guitar: "Stratocaster",
		Detail: "Work on Hendrix-style chord embellishments, double-stops, and expressive bends. A great way to reconnect with the instrument.",
	},
	{
		Key: "slow-dancing", Title: "Slow Dancing in a Burning Room", Artist: "John Mayer",
		WeeksLabel: "3\u20134", WeekStart: 3, WeekEnd: 4, Guitar: "Stratocaster",
		Detail: "Ideal for vibrato, timing, expressive phrasing, and playing fewer notes with greater intention.",
	},
	{
		Key: "cliffs-of-dover", Title: "Cliffs of Dover", Artist: "Eric Johnson",
		WeeksLabel: "3\u20138", WeekStart: 3, WeekEnd: 8, Guitar: "Stratocaster",
		Detail: "Your long-term technical challenge. Start with short phrases and build accuracy before speed. There's no need to master the whole song in eight weeks.",
	},
	{
		Key: "my-curse", Title: "My Curse", Artist: "Killswitch Engage",
		WeeksLabel: "5\u20138", WeekStart: 5, WeekEnd: 8, Guitar: "Sterling JP150",
		Detail: "Focus on alternate picking, palm muting, tight rhythms, and clean transitions. The studio song uses Drop C, so a suitable guitar setup or pitch-shifting solution will help.",
	},
}

var presetDefs = []Preset{
	{Key: "mayer-clean", Name: "Mayer Clean", Guitar: "Strat", Character: "Warm, lightly compressed, edge-of-breakup"},
	{Key: "eric-johnson-lead", Name: "Eric Johnson Lead", Guitar: "Strat / HILS", Character: "Singing sustain, smooth overdrive, delay"},
	{Key: "pearl-jam-crunch", Name: "Pearl Jam Crunch", Guitar: "Strat / HILS", Character: "British-style crunch, dynamic response"},
	{Key: "killswitch-rhythm", Name: "Killswitch Rhythm", Guitar: "Sterling", Character: "Tight high gain, boosted amp, noise gate"},
}

func Schedule() []ScheduledDay {
	out := make([]ScheduledDay, len(schedule))
	copy(out, schedule)
	return out
}

func DaySchedule(day time.Time) ScheduledDay {
	day = normalize(day)
	return schedule[(int(day.Weekday())+6)%7]
}

func ShortWeekday(day time.Time) string {
	switch normalize(day).Weekday() {
	case time.Monday:
		return "Mon"
	case time.Tuesday:
		return "Tue"
	case time.Wednesday:
		return "Wed"
	case time.Thursday:
		return "Thu"
	case time.Friday:
		return "Fri"
	case time.Saturday:
		return "Sat"
	default:
		return "Sun"
	}
}

func PhasesFor(week int) []Phase {
	out := make([]Phase, len(phases))
	for i, phase := range phases {
		phase.Current = week >= phase.WeekStart && week <= phase.WeekEnd
		out[i] = phase
	}
	return out
}

func CurrentPhase(week int) Phase {
	for _, phase := range PhasesFor(week) {
		if phase.Current {
			return phase
		}
	}
	return Phase{}
}

func Routine() []RoutineItem {
	out := make([]RoutineItem, len(routine))
	copy(out, routine)
	return out
}

func Influences() []Influence {
	out := make([]Influence, len(influences))
	copy(out, influences)
	return out
}

func Guitars() []Guitar {
	out := make([]Guitar, len(guitars))
	copy(out, guitars)
	return out
}

func Advice() []string {
	out := make([]string, len(advice))
	copy(out, advice)
	return out
}

func TheoryTopics() []Theory {
	out := make([]Theory, len(theory))
	copy(out, theory)
	return out
}

func PlanCommitment() Commitment {
	return Commitment{
		SessionsPerWeek: 5,
		LighterDays:     2,
		SessionMinutes:  30,
		WeeklyMinutes:   150,
	}
}

func ValidSongStatus(status string) bool {
	switch status {
	case StatusNotStarted, StatusLearning, StatusInRotation, StatusRecorded:
		return true
	default:
		return false
	}
}

func KnownSong(key string) bool {
	return songIndex(key) >= 0
}

func KnownPreset(key string) bool {
	return presetIndex(key) >= 0
}

func songIndex(key string) int {
	for i, song := range songDefs {
		if song.Key == key {
			return i
		}
	}
	return -1
}

func presetIndex(key string) int {
	for i, preset := range presetDefs {
		if preset.Key == key {
			return i
		}
	}
	return -1
}

func Songs(week int, notStarted bool, states map[string]SongState) []Song {
	out := make([]Song, len(songDefs))
	for i, def := range songDefs {
		out[i] = applySong(def, week, notStarted, states[def.Key])
	}
	return out
}

func ProjectSong(key string, week int, notStarted bool, state SongState) (Song, bool) {
	i := songIndex(key)
	if i < 0 {
		return Song{}, false
	}
	return applySong(songDefs[i], week, notStarted, state), true
}

func applySong(def Song, week int, notStarted bool, state SongState) Song {
	if state.Status == "" {
		def.Status = StatusNotStarted
	} else {
		def.Status = state.Status
	}
	def.Notes = state.Notes
	def.InCurrentBlock = !notStarted && week >= def.WeekStart && week <= def.WeekEnd
	return def
}

func Presets(dialed map[string]bool) []Preset {
	out := make([]Preset, len(presetDefs))
	for i, def := range presetDefs {
		def.DialedIn = dialed[def.Key]
		out[i] = def
	}
	return out
}

func ProjectPreset(key string, dialed bool) (Preset, bool) {
	i := presetIndex(key)
	if i < 0 {
		return Preset{}, false
	}
	preset := presetDefs[i]
	preset.DialedIn = dialed
	return preset, true
}

func DefaultMinutes(kind string) int {
	switch kind {
	case KindMain:
		return 30
	case KindLight:
		return 10
	default:
		return 0
	}
}
