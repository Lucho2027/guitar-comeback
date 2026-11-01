VERDICT: CHANGES
Summary: The failure map grows without bound.

## Must fix
1. `internal/auth/limiter.go:24`: entries are never removed, so memory grows with every distinct IP. Evict entries older than the window when checking, and add a test.
