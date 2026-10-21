# Guitar Comeback

Local API for an eight-week guitar practice plan. The contract is hand-written JSON over HTTP, stored in PostgreSQL. The web client lives in `web/` and is built separately.

## Configure

Environment variables override `.env`. When `.env` exists in the working directory, it fills any variables that are not already set.

```bash
cp .env.example .env
```

`DATABASE_URL` points at the `guitar_comeback` database. On startup the API creates that database if it is missing, applies `internal/db/migrations/001_init.sql`, and seeds a user when `users` is empty.

PostgreSQL is expected at `127.0.0.1:5432`. Do not start another Postgres on that port.

## Run the API

From this directory:

```bash
go run ./cmd/api
```

The server listens on `http://127.0.0.1:8090`.

```bash
curl -s http://127.0.0.1:8090/api/health
```

## Seeded login

The seed plan starts on the Monday of the current local week.

- Email: `lucho@local`
- Password: `comeback`

```bash
curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"lucho@local","password":"comeback"}' \
  http://127.0.0.1:8090/api/auth/login
```

Send the `session` cookie on later requests.

## Web app

Run the web app from `web/` on port 5175. It proxies `/api` to `http://127.0.0.1:8090`. Start the API first, then open `http://127.0.0.1:5175`.

## Tests

```bash
go test ./...
```
