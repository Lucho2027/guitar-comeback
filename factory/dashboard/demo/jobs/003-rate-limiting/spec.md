# Rate-limit login attempts

## Goal
Stop password guessing against `POST /api/auth/login` without bothering a guitarist who mistypes once or twice.

## Scope
- In: an in-memory limiter keyed by client IP, a 429 response, and the message on the login page.
- Out: persistent limits across restarts, per-account lockout, and CAPTCHA.

## Design
- New `internal/auth/limiter.go`: a sliding window of failures per key, using an injectable clock.
- `internal/api/auth.go`: check the limiter before verifying the password, record a failure on a bad password, and reset on success.
- `web/src/pages/Login.tsx`: show the API's error message in the existing alert.

## Acceptance criteria
- AC-1: The 6th failed login from one IP within 10 minutes returns 429 `{"error":"Too many attempts. Try again in 10 minutes."}`. Verify: `TestLimiterBlocksSixth`
- AC-2: The block lifts after 10 minutes. Verify: `TestLimiterExpires` with a fake clock
- AC-3: A successful login clears the failures for that IP. Verify: `TestLimiterResetsOnSuccess`
- AC-4: The login page shows the 429 message in its alert. Verify: manual, wrong password ×6

## Risks
Behind a proxy every client shares one IP. The API binds to localhost and the web proxy forwards, so key on `RemoteAddr` and don't trust `X-Forwarded-For`.
