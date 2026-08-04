---
date: 2026-07-27
topic: cedolini-url-state
type: feature
status: approved
origin: brainstorming — center mode tabs; persist mode + month in URL search
---

# feat: Cedolini header centering + URL search state

## Summary

Center the Board / Controlli / Pagamenti tabs in the Cedolini header. Persist `mode` and `month` in URL search params so refresh restores the selection. Empty URL keeps current defaults; once the user changes either control, both params are written and kept. Sidebar “Cedolini” always lands on a clean path.

## Header layout

Three zones in the top `SectionHeader` row:

- Left: title (+ subtitle)
- Center: mode tabs (true visual center via absolute inset + flex center)
- Right: month switcher

Add optional `SectionHeader.Center` compound slot so other pages stay unchanged.

## URL contract

| Param   | Values                                      | Absent → default              |
|---------|---------------------------------------------|-------------------------------|
| `mode`  | `board` \| `controlli` \| `pagamenti`       | `board`                       |
| `month` | `YYYY-MM`                                   | `getCurrentMonthValue()`      |

Rules:

1. Fresh `/payroll/cedolini` (no search) → defaults; do **not** write params until the user changes mode or month.
2. After any user change → write **both** params (including when values equal defaults).
3. Invalid param values → ignore, fall back to defaults.
4. Updates use `history.replaceState` (no history spam).
5. Sidebar open Cedolini → always `/payroll/cedolini` with empty search, even when already on that path; view re-reads URL and resets to defaults.

## Implementation sketch

- Pure parse/write helpers in `payroll/lib` (+ unit tests).
- `PayrollOverviewCedoliniView` owns state; sync from URL on `popstate` and a small same-document search-change signal when the shell clears the query.
- `handleOpenPayrollCedolini` forces a clean path + notifies the view.
- `SectionHeader.Center` for layout only.

## Out of scope

- Filters / search text in URL
- Extending `AppRoute` path model
- Other payroll tabs
