# Guitar Comeback — MVP product spec

Status: draft for review · Owner: Luis Rodriguez · Date: 2026-11-03

## 1. Vision

One place for a guitarist who is working on their technique and knowledge to see where they stand: the songs
they are learning and how far along each one is, a daily practice journal, the theory they understand, and the
goals they are working toward.

The app today is a hard-coded eight-week plan for one person. The MVP replaces that content with data the
user creates. It stays a single-user app for now, but it is built so that sign-up can be added later without
reshaping the data.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Users | One seeded login (as today). Every new table has a `user_id`, and every query is scoped by it, so multi-user is a later feature, not a rewrite. |
| Old 8-week plan | Replaced by user-owned data. Existing song progress and practice-day logs are **migrated**, not lost. Old tables stay in place (no `DROP`) until after the MVP ships. |
| Song progress | A song is split into sections. Each section is *not started*, *learning*, or *solid*. The song's % is calculated from its sections. |
| MVP areas | Songs, Practice journal + calendar, Theory log, Goals, Dashboard. |
| Stack | Unchanged: Go API, PostgreSQL, SolidJS web app, conventions in `factory/repo.md`. |

## 3. Users and core jobs

The primary user is an intermediate guitarist coming back to regular practice. They want to:

1. **Keep a song list**: add songs they want to learn and see how much of each one they can play.
2. **Journal every practice day**: how long they played, what they worked on, what they learned, and what still needs work.
3. **See their history on a calendar**: which days they practiced and how much, and open any past day.
4. **Track knowledge**: theory and fretboard concepts they are learning or already understand.
5. **Set goals and finish them**: concrete targets, optionally with a date and a linked song.
6. **Get a quick read on their progress** the moment they open the app.

## 4. Functional requirements

### 4.1 Songs (library + progress)

**Song fields**

| Field | Rules |
|---|---|
| Title | Required, 1–120 characters after trimming. |
| Artist | Optional, ≤120 characters. |
| Status | `want_to_learn` · `learning` · `can_play` · `polished`. Set by the user. Defaults to `want_to_learn`. |
| Tuning | Optional, ≤40 characters (for example "Drop C"). |
| Reference link | Optional, ≤500 characters, must be an `http://` or `https://` URL. Opens in a new tab with `rel="noopener noreferrer"`. |
| Notes | Optional, ≤4000 characters. |
| Sections | 0–30 ordered sections. |

**Section fields**: a name (required, 1–60 characters, such as "Intro" or "Solo 1"), a state (`not_started` · `learning` · `solid`),
and a position. Sections can be added, renamed, reordered, and deleted.

**Progress % rule** (one source of truth, implemented as a pure function with unit tests):
- `not_started` = 0, `learning` = 50, `solid` = 100. The song's % is the mean of its sections, rounded to the nearest integer.
- A song with no sections has no % and shows "—", not 0%.
- The % never changes the status on its own. Status is the user's own judgement.

**List view**: songs are grouped by status in the order learning → want to learn → can play → polished. Within each group,
the most recently updated song comes first. Each row shows the title, the artist, the status, and a progress bar with the %.

**Delete**: the user must confirm. Deleting a song removes its sections and its links to journal entries. Journal entries
stay, and goals linked to the song lose the link but are kept.

### 4.2 Practice journal + calendar

**One entry per calendar day per user.** Entry fields:

| Field | Rules |
|---|---|
| Date | `YYYY-MM-DD`. Cannot be more than 1 day after the server's date, which allows for time zones. Past dates are allowed. |
| Minutes practiced | Integer, 0–720. Required. |
| Worked on | Free text, ≤4000 characters ("alternate picking at 90 bpm, verse of Yellow Ledbetter"). |
| Learned | Free text, ≤4000 characters. |
| Needs work | Free text, ≤4000 characters. |
| Songs practiced | 0 or more links to the user's own songs. |

- An entry counts as a **practice day** when minutes > 0.
- Saving an existing date updates that entry. Deleting an entry needs confirmation.
- **Calendar**: a month grid (Monday first) with previous and next month controls and a "Today" button. Each day shows whether
  it has a practice day, with 3 levels of intensity by minutes (1–20, 21–45, and 46 or more). Today is visibly marked.
  Future days can't be selected. Selecting a day opens its entry, or an empty form if there is none.
- At 375px wide the calendar must still be usable. A compact grid or a week list are both acceptable.

### 4.3 Theory / knowledge log

- Topic fields: a name (required, 1–120 characters), a category (optional, ≤40 characters, such as "Scales", "Chords",
  or "Fretboard"), a state (`to_learn` · `learning` · `understood`), and notes (≤4000 characters).
- List grouped by state (learning → to learn → understood), with a filter by category.
- An empty state explains what this page is for and offers to "Add a topic". There is no pre-seeded curriculum in the MVP.

### 4.4 Goals

- Goal fields: a title (required, 1–160 characters), a target date (optional), a linked song (optional, must be the
  user's own song), notes (≤4000 characters), and a status (`open` · `done`). Marking a goal done records `completed_at`.
  Reopening it clears that value.
- Open goals are sorted by target date (soonest first, with undated goals last). Completed goals sit in a collapsed
  "Done" list, newest first.
- An open goal whose target date has passed is shown as **overdue**, with text and not only color.

### 4.5 Dashboard (home page after login)

Shows, for the logged-in user:

1. **Current streak**: the number of consecutive practice days ending today, or ending yesterday if today isn't logged yet. 0 if neither.
2. **Minutes this week** (Monday–Sunday) and **minutes in the last 30 days**, counting today.
3. **Songs in progress**: up to 5 `learning` songs with their %, most recently updated first.
4. **Upcoming goals**: up to 3 open goals with their target dates, including any that are overdue.
5. **Needs work**: the "needs work" text from the 3 most recent entries that have it, each with its date.
6. A primary **"Log today"** action that opens today's journal entry.

Every block has an empty state that tells the user what to do next.

### 4.6 Navigation and shell

Five sections: **Dashboard · Journal · Songs · Theory · Goals**. On desktop they are a persistent nav, and at 375px
they are a bottom bar or a menu. Logout stays available. The old Workstation page is gone once the retirement job
is done (see §7, J6).

## 5. Non-functional requirements

- **Auth and isolation**: every new route is wrapped in `requireAuth`. Every read and write is scoped to the session's
  user. Asking for another user's id returns **404** (not 403), so the app doesn't reveal what exists. Tests use a
  second user to prove this.
- **Validation**: limits are enforced on the server (UI checks are only a convenience). Bad input returns 400 with
  `{"error": "<human-readable message>"}`. Web forms show that message with `role="alert"`.
- **Data safety**: schema changes are new numbered migrations only. Data migrations are idempotent, so running them twice
  doesn't create duplicates. No `DROP` of old tables during the MVP.
- **UI**: the existing dark theme tokens and fonts only, semantic controls, visible `:focus-visible`, and labels on every
  input. Every page works at 375px. Every page has loading, empty, and error states.
- **Performance**: each page loads with one or two API calls. Lists are fine unpaginated at MVP scale
  (up to roughly 500 songs and 2,000 journal entries).
- **Checks**: `gofmt`, `go vet`, `go test`, and the web `typecheck` and `build` all pass (see `factory/repo.md`).

## 6. Out of scope for the MVP (later list)

- Public sign-up, password reset, and multiple users in the UI.
- A per-skill tempo/BPM tracker (the old tempo ladder is retired, not rebuilt).
- Several sessions per day, or timers inside the app.
- Audio or video recording and uploads, tabs or notation rendering, a metronome.
- Pre-built curricula or plan templates, including the old eight-week plan as a template.
- CSV or JSON export (existing backlog item), reminders and notifications, charts beyond the dashboard numbers.
- Rate-limiting logins (existing backlog item). It is independent of this spec and can ship at any time.

## 7. Delivery plan — factory jobs

Each job is one branch and one `/factory` run, built in this order because each depends on the ones before it.
The backlog line is what goes into `factory/backlog.md`. The spec-writer should read this file for the details.

| # | Backlog line | Depends on |
|---|---|---|
| J1 | Song library with sections and calculated progress, replacing the hard-coded songs (see docs/mvp-spec.md §4.1, §7 J1). | — |
| J2 | Daily practice journal with a month calendar, replacing the old practice-day log (see docs/mvp-spec.md §4.2, §7 J2). | J1 |
| J3 | Theory and knowledge log (see docs/mvp-spec.md §4.3, §7 J3). | — |
| J4 | Goals with optional target date and linked song (see docs/mvp-spec.md §4.4, §7 J4). | J1 |
| J5 | Dashboard as the home page, plus the five-section navigation (see docs/mvp-spec.md §4.5, §4.6, §7 J5). | J1–J4 |
| J6 | Retire the eight-week plan UI and its API routes (see docs/mvp-spec.md §7 J6). | J5 |

The existing backlog item "Show the current streak…" is covered by J5 and should be removed from the backlog.

Until J5 ships, each new page is reachable from a link in the current header, so every job can be reviewed on its own.

### J1 — Song library
- **AC-1** Creating, editing, and deleting a song (with confirmation) works through the API and the UI, and enforces every rule in §4.1. Verify: Go handler tests, plus a manual check.
- **AC-2** Sections can be added, renamed, reordered, have their state changed, and be deleted, up to 30 per song. A 31st returns 400. Verify: Go test.
- **AC-3** The progress % follows the §4.1 rule, including "no sections = no %" and rounding. Verify: a table-driven unit test on a pure function.
- **AC-4** A reference link that isn't `http(s)` (for example `javascript:alert(1)`) is rejected with 400. Verify: Go test.
- **AC-5** The migration copies the seeded user's 4 existing songs from `song_progress` and the plan content, mapping status
  `not_started→want_to_learn`, `learning→learning`, `in_rotation→can_play`, and `recorded→polished`, and keeping notes. Running it twice creates no duplicates. Verify: Go test against the migration.
- **AC-6** User B gets 404 when reading, updating, or deleting user A's song or sections. Verify: Go test.
- **AC-7** The Songs list groups and sorts as in §4.1, shows a progress bar or "—", and works at 375px. Verify: manual check.

### J2 — Practice journal + calendar
- **AC-1** An entry for a date can be created, read, updated, and deleted (with confirmation). A second save for the same date updates the entry instead of duplicating it. Verify: Go test.
- **AC-2** Minutes outside 0–720, text over 4000 characters, a malformed date, or a date more than 1 day ahead return 400. Verify: Go test.
- **AC-3** Songs practiced only accept the user's own song ids. Another user's id returns 400 or 404 and nothing is saved. Verify: Go test.
- **AC-4** One API call returns a month of entries for the calendar, with dates and minutes. Verify: Go test.
- **AC-5** The calendar shows intensity levels, marks today, blocks future days, moves between months, and opens a day's entry. It works at 375px. Verify: manual check.
- **AC-6** The migration copies existing `practice_days` rows with minutes > 0 or `completed = true` into entries. Old notes go to "Worked on", with the checked routine blocks and guitar added as text. It is idempotent. Verify: Go test.

### J3 — Theory log
- **AC-1** Topics can be created, edited, and deleted with the §4.3 rules enforced. Verify: Go test.
- **AC-2** The list groups by state and filters by category. The empty state includes "Add a topic". Verify: manual check.
- **AC-3** User isolation as in §5. Verify: Go test.

### J4 — Goals
- **AC-1** Goals can be created, edited, and deleted. Marking one done sets `completed_at`, and reopening it clears it. Verify: Go test.
- **AC-2** A linked song must belong to the user. Deleting the song keeps the goal and clears the link. Verify: Go test.
- **AC-3** The sort order and "overdue" rule from §4.4 live in a pure function with unit tests. Verify: Go test.
- **AC-4** Overdue goals are labelled in text, and done goals are collapsed. Verify: manual check.

### J5 — Dashboard + navigation
- **AC-1** Streak: a pure function with tests for no entries, today only, a run ending yesterday, a gap, and a 0-minute entry that breaks the streak. Verify: Go test.
- **AC-2** Minutes this week and in the last 30 days are correct at week and month boundaries. Verify: Go test.
- **AC-3** One `GET` returns all six dashboard blocks from §4.5, limited and sorted as specified. Verify: Go test.
- **AC-4** After login the user lands on the Dashboard. "Log today" opens today's entry. Every block has an empty state. Verify: manual check.
- **AC-5** The five-section nav works on desktop and at 375px with keyboard focus visible. Verify: manual check.

### J6 — Retire the eight-week plan
- **AC-1** The Workstation page, its components, and the routes for `/api/plan*`, `/api/tempo*`, `/api/presets/*`, `/api/recordings`,
  `/api/home`, and the old `/api/days/*` and `/api/songs/{key}` are removed, and their handlers and tests are deleted or replaced. Verify: `grep` plus `go test`.
- **AC-2** No migration drops the old tables. Verify: review the diff.
- **AC-3** All checks pass and every page from J1–J5 still works. Verify: checks plus a manual pass.

## 8. MVP definition of done

The MVP is done when J1–J6 are merged and this walkthrough works on a phone-sized screen (375px) and on desktop:

1. Log in and land on the Dashboard, which shows the migrated songs and the existing streak.
2. Add the song "Little Wing" with sections Intro, Verse, and Solo. Mark Intro *solid* and Verse *learning*. The song shows **50%**.
3. Log today: 35 minutes, Little Wing practiced, "Learned: double-stop slides", "Needs work: solo timing".
4. The calendar shows today at the middle intensity level. The Dashboard streak goes up by one, and "solo timing" appears under Needs work.
5. Add the theory topic "CAGED — E shape" as *learning*.
6. Add the goal "Play Little Wing intro cleanly" with a date in the past. It shows as overdue. Mark it done and it moves to Done.
7. Log out and log back in. Everything is still there.

## 9. Open questions (not blocking J1)

- Should "Log today" use the browser's date or a time zone set by the user? The MVP sends the browser's local date and the server allows +1 day.
- Should the old eight-week plan come back later as an optional template?
