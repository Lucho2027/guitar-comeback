# Build: 003-rate-limiting
Branch: factory/003-rate-limiting · Worktree: .worktrees/003-rate-limiting

## Round 1
Commits: a1c9e02 Add a sliding-window login limiter. · 5d7b310 Reject logins over the limit with 429.
| AC | Status | Evidence |
|----|--------|----------|
| AC-1 | met | `go test ./internal/auth -run TestLimiterBlocksSixth` |
| AC-2 | met | `TestLimiterExpires` |
| AC-3 | met | `TestLimiterResetsOnSuccess` |
| AC-4 | met | manual: alert shows the message |
Checks: gofmt ✓ · go vet ✓ · go test ✓ · web typecheck/build ✓

## Round 2
Commits: 9e41f7a Key the limiter on RemoteAddr only. · c03b5d8 Evict idle limiter entries.
Review response:
- security #1 (X-Forwarded-For spoofing): now keyed on `RemoteAddr` host only.
- code #1 (unbounded map): entries older than the window are evicted on each check, and a test covers it.
