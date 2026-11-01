---
name: factory
description: Run the software factory. Takes a feature through spec, build, four parallel reviews, and approval, then merges it to main. Commands are /factory <feature>, /factory next, /factory approve <job-id>, and /factory rework <job-id> <note>.
argument-hint: <feature> | next | approve <job-id> | rework <job-id> <note>
disable-model-invocation: true
---

# /factory — you are the orchestrator

You run the loop below. You spawn every agent, and you are the **only writer of `factory/board.json`**.
Don't do an agent's work yourself: no writing specs, code, reviews, or decisions.
Agents get their context from files, so every spawn prompt is just paths plus one sentence of instructions.

Arguments: `$ARGUMENTS`

## Settings

| name | value |
|---|---|
| BASE | `main` (the branch jobs start from and merge into) |
| MAX_RESUMES | `2` (times the builder may be sent back after a review round) |
| ROOT | `git rev-parse --show-toplevel` (this checkout, which holds `factory/`) |
| JOB | `ROOT/factory/jobs/<job-id>` |
| WT | `ROOT/.worktrees/<job-id>` (the builder's git worktree on branch `factory/<job-id>`) |

## The loop (edit this to change the factory)

```
feature ─► spec-writer ─► builder ◄─────────────────────────────┐
           (opus)         (opus)                                │
                            │                                   │
          ┌──────────┬──────┴─────┬──────────┐                  │
       security      ux       ui design     code                │
        (opus)    (sonnet)    (sonnet)    (sonnet)              │
          └──────────┴──────┬─────┴──────────┘                  │
                     WAIT FOR ALL 4 ── any CHANGES ─────────────┘
                            │          (resume builder, max MAX_RESUMES)
                            ▼ all PASS
                        approver (opus)
                   APPROVE │      │ ESCALATE
                           ▼      ▼
                  merge to BASE   needs-human ◄── /factory approve
```

| step | agent (`.claude/agents/`) | reads | writes |
|---|---|---|---|
| spec | `spec-writer` | `feature.md` | `spec.md` |
| build | `builder` (named `builder-<job-id>`) | `spec.md`, round folder, `rework-*.md` | code + commits in WT, `build.md` |
| review | `reviewer-security`, `reviewer-ux`, `reviewer-ui`, `reviewer-code` | `spec.md`, `build.md`, diff | `round-N/review-<key>.md` |
| approve | `approver` | everything in JOB, diff | `decision.md` |

## Board

`factory/board.json` drives the dashboard (`npm run factory-dashboard`). Create it as `{ "jobs": [] }` if it's missing.
After **every** state change, rewrite the job's entry, set `updated` (`date -u +%FT%TZ`), and check that the JSON is
valid (`jq . factory/board.json >/dev/null`). Each job has these fields:

```json
{ "id": "003-rate-limiting", "title": "Rate-limit login attempts", "branch": "factory/003-rate-limiting",
  "stage": "review", "round": 2, "resumes": 1,
  "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "pending", "code": "PASS" },
  "history": [ { "security": "CHANGES", "ux": "PASS", "ui": "PASS", "code": "CHANGES" } ],
  "decision": null, "note": "", "updated": "2026-11-01T14:03:00Z" }
```

- `stage` is one of `spec`, `build`, `review`, `approval`, `merged`, or `needs-human`.
- `reviews` holds the current round. When a new round starts, push the old `reviews` onto `history`.
- `note` is a one-line reason for anything a human should know, required for `needs-human`.

## Commands

Start every command by `cd`-ing to ROOT and checking that BASE exists (`git rev-parse --verify BASE`).
If it doesn't exist, stop and ask the user which branch to use. Don't create it unasked.

### `/factory <feature>` — new job
1. **Job id**: take the next 3-digit number after the highest one in `factory/jobs/`, then a 2–4 word kebab slug
   (for example `004-login-rate-limit`).
2. `mkdir -p JOB`, then write the feature text verbatim to `JOB/feature.md`. Add the job to the board with `stage: spec`, `round: 0`, `resumes: 0`.
3. **Spec**: spawn `spec-writer` (foreground) with `Job folder: JOB`. When it returns, `spec.md` must exist.
   If it doesn't, go to **Needs human**.
4. **Worktree**: `git worktree add WT -b factory/<job-id> BASE`. Set the board to `stage: build`.
5. **Build**: spawn `builder` with **name `builder-<job-id>`** (foreground). The prompt is `Job folder: JOB. Worktree: WT. Branch: factory/<job-id>. Base: BASE.`
   If your Agent tool has no `name` parameter, record the returned agent id in the job as `builder_agent`
   and use that with SendMessage. When the builder is done, `git log BASE..factory/<job-id>` must show commits and
   `build.md` must exist. If either is missing, go to **Needs human**.
6. **Review round N** (N = round + 1):
   - `mkdir JOB/round-N`. On the board, set `stage: review`, `round: N`, and set all four `reviews` to `pending`.
   - Spawn the four reviewers **in one message, in the background**, each with
     `Job folder: JOB. Worktree: WT. Base: BASE. Round folder: JOB/round-N.`
   - As each one finishes, read the first line of its file (`VERDICT: PASS` or `VERDICT: CHANGES`) and update that chip on the board right away.
   - **WAIT FOR ALL**: the round is done only when all four `review-*.md` files exist in `round-N/`.
     Don't resume the builder mid-round, even if a CHANGES verdict has already landed.
     If a reviewer returns without its file, respawn it once. If it still fails, go to **Needs human**.
     A file whose first line isn't a valid verdict counts as `CHANGES`.
7. **Any CHANGES**: if `resumes < MAX_RESUMES`, increment `resumes`, set `stage: build`, and SendMessage to
   `builder-<job-id>`: `Round N reviews are in JOB/round-N/. Address every CHANGES finding, commit, and add a "Round N+1" section to build.md.`
   Wait for it, then go to step 6.
   If `resumes` is already MAX_RESUMES, go to **Needs human** with the note `still CHANGES after round N`.
   If SendMessage can't reach the builder (for example, in a new session), spawn a fresh `builder` with the same name and add
   `Resume: read build.md and JOB/round-N/ first.` to its prompt.
8. **All PASS**: set `stage: approval` and spawn `approver` (foreground) with `Job folder: JOB. Worktree: WT. Base: BASE.`
   Read the first word of `decision.md`. `APPROVE` goes to **Merge**. `ESCALATE` goes to **Needs human**, using the decision's
   reason line as the note. Put the word in `decision` on the board.

### `/factory next`
Find the first `- [ ]` line in `factory/backlog.md`. If there isn't one, say the backlog is empty and stop.
Otherwise change it to `- [x] … → <job-id>` and run `/factory <that text>`.

### `/factory approve <job-id>`
This is a human override. The job must be in `needs-human` (or `approval`). Run **Merge** and set the board note to `approved by human`.

### `/factory rework <job-id> <note>`
The job must exist and not be `merged`. Write the note verbatim to `JOB/rework-K.md`, where K is the next free number.
If WT is missing, run `git worktree add WT factory/<job-id>`. Set `resumes: 0` (the human grants a fresh budget) and `stage: build`.
Resume `builder-<job-id>` (or spawn a fresh one, as in step 7) with
`Human rework requested in JOB/rework-K.md. Address it, commit, and add a section to build.md.`
Then continue from step 6 with the next round number.

### Merge
1. Find the checkout that has BASE: `git worktree list --porcelain`, then take the `worktree` line before `branch refs/heads/BASE`.
   If BASE isn't checked out anywhere, run `git -C WT switch BASE` and use WT.
2. In that checkout, run `git merge --no-ff factory/<job-id> -m "Merge factory/<job-id>: <title>."`.
   On a conflict or failure, run `git merge --abort` and go to **Needs human** with the git error as the note.
3. Run `git worktree remove WT` (unless WT is the merge checkout) and `git branch -d factory/<job-id>`.
4. Update the board to `stage: merged`. Never push.

### Needs human
Set the board to `stage: needs-human` with a one-line `note`, and leave the worktree and branch in place.
Tell the user what's blocked and the two ways forward: `/factory approve <job-id>` or `/factory rework <job-id> <note>`.

## Finish

End with a short report: the job id, the final stage, the round count, each round's verdicts, and the decision.
Mention that `npm run factory-dashboard` shows the board.
