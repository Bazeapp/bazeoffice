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
npx playwright test --project=payroll
```

Projects map to role tokens: `customer`, `sales`, `recruiter`, `payroll`.

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

- `e2e/smoke.spec.ts` — authenticated shell per project
- `e2e/example.spec.ts` — famiglia mutation via service role (recruiter project)
- `e2e/support/famiglia-mutations.ts` — simulate external family webapp writes
- `e2e/support/route-errors.ts` — `page.route` error injection (for future feature specs)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No supabase/config.toml` | Set `SUPABASE_WORKDIR` or clone backend to `../baze-supabase` |
| Login 500 "Database error querying schema" | Re-run `node e2e/ensure-supabase.mjs` (db reset) |
| Missing Supabase key error | Run `node e2e/ensure-supabase.mjs` or full `npm run e2e` |
| Login fails for E2E user | Ensure `seed_e2e_operators.sql` ran; check `auth.identities` row exists |
| White screen / login form in smoke | Re-run ensure-supabase after backend changes |

See also: `docs/solutions/integration-issues/local-supabase-test-user-and-auth-schema-500.md`
