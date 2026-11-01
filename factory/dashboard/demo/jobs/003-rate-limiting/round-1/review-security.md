VERDICT: CHANGES
Summary: The limiter key can be spoofed by the client.

## Must fix
1. `internal/api/auth.go:61`: the key comes from `X-Forwarded-For`, which the client controls. An attacker can rotate the header to get unlimited attempts. Key on the `RemoteAddr` host instead.

## Optional
- Log at `slog.Warn` when an IP gets blocked.
