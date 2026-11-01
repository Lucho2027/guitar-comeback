VERDICT: CHANGES
Summary: The block can be sidestepped by succeeding on another account.

## Must fix
1. `internal/api/auth.go:78`: `Reset(ip)` runs on any successful login, so an attacker with one valid account can clear their own block and keep guessing other passwords. Only reset the failures for the account that succeeded, or don't reset by IP at all.
