# Playwright E2E (local-only)

End-to-end tests run against a **local Supabase** stack in the sibling
[`baze-supabase`](../../baze-supabase) repo (`Bazeapp/backend-supabase` on GitHub).
They are **opt-in** — not part of `npm test`, lefthook, or CI.

## Prerequisites

- Docker
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Node.js (same as bazeoffice)
- Sibling checkout: `../baze-supabase` (or set `SUPABASE_WORKDIR`)

## First-time setup

### 1. Install Playwright browser

```bash
npx playwright install chromium
```

### 2. Backend repo

Clone the backend next to bazeoffice if you have not already:

```bash
# from bazeoffice parent directory
git clone https://github.com/Bazeapp/backend-supabase.git baze-supabase
```

E2E seed files (local only, never migrations):

- `supabase/seed_e2e_operators.sql` — four operator users (`e2e-<role>@local.test`)
- `supabase/seed_e2e_famiglia.sql` — famiglia fixture for mutation template
- `supabase/seed_e2e_pipeline.sql` — multi-stage Sales Pipeline board fixture

These run on every `supabase db reset` via `config.toml` `sql_paths`.

## Run tests

`npm run e2e` runs **`ensure-supabase` first** (start + db reset + write keys), then Playwright:

```bash
npm run e2e          # headless, vite preview (deterministic)
npm run e2e:ui       # interactive UI mode
npm run e2e:dev      # faster: dev:nostrict instead of preview build
```

Ensure-supabase writes `e2e/.runtime-env.json` (gitignored) with keys from
`supabase status`. Override backend path:

```bash
SUPABASE_WORKDIR=/path/to/baze-supabase npm run e2e
```

Re-run Supabase only (no Playwright):

```bash
node e2e/ensure-supabase.mjs
```

Filter by operator role (Playwright project):

```bash
npx playwright test --project=recruiter
npx playwright test --project=sales
npx playwright test --project=payroll
```

Projects map to role tokens: `customer`, `sales`, `recruiter`, `payroll`. Each project runs
`e2e/shared/` smoke specs plus specs under its own `e2e/<role>/` folder — no cross-role skips.

## Layout

```
e2e/
├── shared/          # smoke — runs on every project
├── sales/           # Sales Pipeline feature specs
├── recruiter/       # recruiter-domain specs
├── customer/        # (smoke only until feature specs land here)
├── payroll/         # (smoke only until feature specs land here)
├── support/         # shared helpers
├── constants.ts
└── global-setup.ts
```

## Operator credentials (local seed)

| Role | Email | Password |
| --- | --- | --- |
| customer | `e2e-customer@local.test` | `password123` |
| sales | `e2e-sales@local.test` | `password123` |
| recruiter | `e2e-recruiter@local.test` | `password123` |
| payroll | `e2e-payroll@local.test` | `password123` |

Session tokens are written to `e2e/.auth/` on each run (gitignored).

## Writing new specs

Copy patterns from:

- `e2e/shared/smoke.spec.ts` — authenticated shell (all roles)
- `e2e/recruiter/famiglia-mutation.spec.ts` — famiglia mutation via service role
- `e2e/sales/pipeline-filters.spec.ts` — Sales Pipeline toolbar filters
- `e2e/sales/pipeline-moves.spec.ts` — kanban moves, acquisition flow, native DnD
- `e2e/sales/pipeline-sheet.spec.ts` — detail sheet, autosave, duplica dialog
- `e2e/support/pipeline.ts` — navigation, filters, synthetic DnD helpers
- `e2e/support/processo-mutations.ts` — service-role `processi_matching` read/write + fixture reset
- `e2e/support/famiglia-mutations.ts` — simulate external family webapp writes
- `e2e/support/route-errors.ts` — `page.route` error injection (for future feature specs)

Add new role-specific specs under `e2e/<role>/`. Playwright picks them up automatically via
`testMatch` in `playwright.config.ts` — no `test.skip` gating needed.

**Navigation:** use relative paths from `selectors.routes` (e.g. `pipeline`, not
`/pipeline`) — a leading `/` escapes Vite's `/bazeoffice/` base and loads a blank page.

**Board data:** local `seed.sql` adds many pipeline rows beyond the 8-row E2E fixture.
Filter assertions target `E2E_PIPELINE` card ids via `expectE2eFixtureCardVisibility`,
not total card count on the board.

### Pipeline specs (`e2e/sales/`)

Fixture map: `E2E_PIPELINE` in `e2e/constants.ts` (8 `processi_matching` rows seeded by
`seed_e2e_pipeline.sql`).

- **Filters** require clicking **Applica filtri**; only toolbar filters persist in
  `localStorage` (`bazeoffice.crmPipelineFamiglie.filters.v1`) — search does not.
- **Moves + persistence:** prefer the sheet **Stato lead** `Select` (same `moveCard` path as
  drag-drop). `pipeline-moves.spec.ts` also covers native HTML5 DnD via Playwright
  `Locator.drop` (`dragCardToColumn`).
- **Mutating tests** call `resetPipelineFixture()` in `afterEach` / `finally` so parallel runs
  stay order-independent.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No supabase/config.toml` | Set `SUPABASE_WORKDIR` or clone backend to `../baze-supabase` |
| Login 500 "Database error querying schema" | Re-run `node e2e/ensure-supabase.mjs` (db reset) |
| Missing Supabase key error | Run `node e2e/ensure-supabase.mjs` or full `npm run e2e` |
| Login fails for E2E user | Ensure `seed_e2e_operators.sql` ran; check `auth.identities` row exists |
| White screen / login form in smoke | Re-run ensure-supabase after backend changes |

See also: `docs/solutions/integration-issues/local-supabase-test-user-and-auth-schema-500.md`
