# Repo profile

Every factory agent reads this first. Keep it accurate when the repo changes.

## What this is

Guitar Comeback: an eight-week guitar practice tracker.

- **API**: Go 1.26, module `github.com/lucho2027/guitar-comeback`. Entry is `cmd/api/main.go`.
  Packages live in `internal/`: `api` (HTTP handlers), `auth`, `config`, `db` (migrations),
  `plan` (pure plan/calendar logic), `store` (PostgreSQL via pgx/v5).
- **Web**: SolidJS + `@solidjs/router`, TypeScript strict, Tailwind v4, Vite, all in `web/`.
  Pages are in `web/src/pages`, components in `web/src/components`, and the API client is `web/src/api.ts`.
- **DB**: PostgreSQL at `127.0.0.1:5432`. Migrations are numbered SQL files in `internal/db/migrations/`.

## Checks (the builder runs all of them. In review, only the code reviewer reruns them, so parallel runs don't collide)

```bash
gofmt -l .            # must print nothing
go vet ./...
go test ./...
cd web && npm ci && npm run typecheck && npm run build   # whenever web/ changed
```

## Conventions

- **HTTP**: stdlib `http.ServeMux` with method patterns (`"PUT /api/days/{date}"`), registered in
  `internal/api/server.go`. Protected routes are wrapped in `s.requireAuth(...)`. Respond with
  `writeJSON` and `writeError`. Errors are JSON `{"error": "..."}`, and internal errors log through `slog` and
  return a generic message. Request bodies are capped by `limitBody`.
- **SQL**: always use pgx placeholders (`$1`), never string-built SQL. Schema changes go in a new numbered migration.
- **Go tests**: plain `testing`, live next to the code (`*_test.go`), use `t.Fatalf("x = %+v", v)`.
  Pure logic in `internal/plan` is the easiest to test. Add tests there or in new pure helpers.
- **Web UI**: dark theme tokens in `web/src/index.css` (`bench`, `panel`, `card`, `ink`, `muted`,
  `line`, `amber` lime accent, `olive` mint, `alert`). Fonts are Barlow, Barlow Condensed (`font-display`),
  and Martian Mono. Don't add new colors or fonts outside the theme. Use semantic buttons and links, visible
  `:focus-visible`, and `role="alert"` for errors, and make it work at 375px wide.
- **Commits**: Conventional Commits, `type(scope): summary`. Use a lowercase imperative summary with no
  trailing period. The types are `feat`, `fix`, `refactor`, `test`, `docs`, `style`, and `chore`, and the scope
  is the area touched (`api`, `auth`, `store`, `plan`, `web`). For example, `feat(auth): rate-limit failed logins`.
  Add a short prose body explaining why when useful.

## Do not

- Touch `.env`, change `vite.config.ts` host or port bindings (factory previews depend on `WEB_PORT` and `API_PORT`), rename `SESSION_COOKIE`, or start another Postgres.
- Kill or rebind running dev servers (API on `:8090`, web on `:5175`). Use other ports if you need to run something.
- Edit anything under `factory/` or `.claude/` (factory state belongs to the orchestrator).
