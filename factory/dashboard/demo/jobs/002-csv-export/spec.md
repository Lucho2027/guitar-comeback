# CSV export of practice logs

## Acceptance criteria
- AC-1: `GET /api/export.csv` returns one row per logged day, with the columns date, done, minutes, and notes. Verify: `TestExportCSV`
- AC-2: The workstation has an "Export CSV" link. Verify: manual
