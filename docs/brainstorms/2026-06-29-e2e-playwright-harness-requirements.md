---
title: "E2E Playwright harness — local operator roles + famiglia data fixtures"
type: requirements
date: 2026-06-29
origin: docs/plans/2026-06-19-001-test-fase1-safety-net-plan.md
status: confirmed
---

# E2E Playwright harness — local operator roles + famiglia data fixtures

## Summary

Stand up a **local-only Playwright harness** (Phase B / U5 from the Fase 1 safety-net plan) with U8 bundled: Docker + local Supabase, four operator-role auth fixtures, hardcoded local env, and reusable `e2e/` templates. Ricerca feature specs stay deferred. Famiglia are seeded domain data and service-role write targets — not login sessions.

## Problem Frame

Target A (Vitest characterization) is complete. There is no end-to-end coverage and no Playwright install. The Fase 1 plan specifies a local E2E harness against a resettable Supabase stack, kept out of the pre-push gate and CI. BazeOffice is an internal office app: only **operator roles** authenticate here. Families update records in a separate production webapp; E2E still needs famiglia-linked records and a way to simulate those external writes.

## Key Decisions

- **Approach B — Playwright projects per operator role.** Each role (`customer`, `sales`, `recruiter`, `payroll`) maps to a named project with its own `storageState`. Run with `npx playwright test --project=<role>`.
- **Operator auth only.** Four seeded `auth.users` + matching `operatori` rows, one per role token. No famiglia or lavoratore portal logins.
- **Famiglia as data, not actors.** Seed famiglia / processi records in the backend. Simulate family-side writes via service-role helpers in `e2e/support/`, not browser auth.
- **Hardcoded local env.** Committed localhost `VITE_*` URLs and local Supabase keys in harness constants — acceptable because E2E is local-only and never runs in CI.
- **App server: preview default, dev escape hatch.** `webServer` runs `vite preview` of a production build for determinism. A separate script (e.g. `e2e:dev`) may use `dev:nostrict` for faster local debugging.
- **Out of the gate.** Playwright does not join `npm test`, `lefthook.yml`, or GitHub Actions.

## Actors

| Actor | In harness | Notes |
| --- | --- | --- |
| Operator (`customer`) | Authenticated via `storageState` | Customer support staff |
| Operator (`sales`) | Authenticated via `storageState` | Sales staff |
| Operator (`recruiter`) | Authenticated via `storageState` | Recruiter staff |
| Operator (`payroll`) | Authenticated via `storageState` | Payroll staff |
| Famiglia | Seeded DB records only | External webapp updates simulated via service-role helpers |
| Local Supabase | Backend for dev + E2E | Reset via `supabase db reset` in sibling `backend-supabase` repo |

### Operator role tokens

| Token | Meaning |
| --- | --- |
| `customer` | Customer support |
| `sales` | Sales |
| `recruiter` | Recruiter |
| `payroll` | Payroll |

Each seeded operator user must have the matching token in `operatori.ruolo` so app-side role filtering behaves as in production.

## Requirements

**Local environment (U8 prerequisite)**

- R1. Local Supabase runs via Docker in the sibling `backend-supabase` repo; `supabase db reset` provisions seed data idempotently.
- R2. Four login-capable operator users are seeded — one per role token — each with both `auth.users` and `auth.identities` rows (see `docs/solutions/integration-issues/local-supabase-test-user-and-auth-schema-500.md`).
- R3. Each seeded user has a matching `operatori` row with the correct `ruolo` array containing its token.
- R4. Famiglia and related domain records (e.g. `processi_matching`) are present in seed data so specs can assert against real linked data without family login.
- R5. Harness constants expose hardcoded local `VITE_SUPABASE_URL`, publishable anon key, functions URL, and service-role key for mutation helpers.

**Playwright harness**

- R6. `@playwright/test` is added as a devDependency with `e2e` and `e2e:ui` scripts. `npm test` and lefthook are unchanged.
- R7. `playwright.config.ts` sets `testDir: "e2e"`, configures `webServer` (preview by default), and defines one **project per operator role**, each pointing at `e2e/.auth/<role>.json`.
- R8. `e2e/global-setup.ts` signs in each operator user programmatically and writes all four `storageState` files before specs run.
- R9. `vitest.config.ts` `include` globs remain `src/**` only — no Playwright specs picked up by Vitest.
- R10. `.gitignore` covers `e2e/.auth/`, `playwright-report`, and `test-results`.

**Support layer and template**

- R11. `e2e/support/` provides shared selectors, route-error utilities (for future error-injection specs), and a **service-role mutation helper** that writes famiglia-linked records as if the external family webapp had updated them.
- R12. A smoke spec validates harness wiring: authenticated app shell renders under at least one project.
- R13. An `e2e/example.spec.ts` (or equivalent template) documents the pattern: pick a project/role, navigate, assert visible behavior, optionally call mutation helpers in `beforeAll`.
- R14. `e2e/README.md` is the local runbook: start backend, reset/seed, run E2E, switch preview vs dev:nostrict.

**Safety**

- R15. Existing Vitest suite and pre-push gate (`test` + `tsc` + `lint`) stay green and hermetic — no Docker required for `npm test`.
- R16. Seeded operator credentials are throwaway local-only values safe to commit in backend seed files. Session tokens in `storageState` files are never committed.

## Key Flows

### F1. Harness bootstrap

- **Trigger:** Developer runs `npm run e2e`.
- **Actors:** `global-setup`, local Supabase, `webServer`.
- **Steps:** Ensure local stack is up → `global-setup` signs in four operators → writes `storageState` per role → Playwright starts preview server with hardcoded local env → smoke/template specs run under selected project(s).
- **Outcome:** Green smoke run proves auth, env, and app boot against local Supabase.
- **Covered by:** R1–R8, R12–R14

### F2. Simulate family-side record update

- **Trigger:** Spec needs BazeOffice to reflect a change made by the external family webapp.
- **Actors:** Service-role mutation helper, seeded famiglia data.
- **Steps:** Spec calls helper (e.g. update famiglia field or linked process record) via service role → navigates or waits for realtime refresh → asserts visible BazeOffice state.
- **Outcome:** Office UI shows the externally originated change without a famiglia browser session.
- **Covered by:** R4, R5, R11, R13

## Acceptance Examples

- AE1. **Harness smoke (covers R12)**
  - **Given:** Local Supabase is running and seeded.
  - **When:** `npm run e2e` runs the smoke spec under the `recruiter` project.
  - **Then:** The authenticated app shell loads without a login form and without a white screen.

- AE2. **Role isolation (covers R7, R8)**
  - **Given:** All four `storageState` files exist after `global-setup`.
  - **When:** `npx playwright test --project=payroll` runs.
  - **Then:** Only the payroll project's specs execute with the payroll session — no cross-role login per spec.

- AE3. **Famiglia data mutation (covers R11, F2)**
  - **Given:** A seeded famiglia record exists and a recruiter-session spec is open on a view that displays it.
  - **When:** The spec calls the service-role helper to update a famiglia-linked field, then reloads or waits for sync.
  - **Then:** The updated value is visible in BazeOffice.

- AE4. **Gate unchanged (covers R15)**
  - **Given:** No Playwright dependency in the vitest run path.
  - **When:** `npm test` runs without Docker or a local Supabase stack.
  - **Then:** All Vitest tests pass as before.

## Scope Boundaries

**In scope**

- U8 local environment setup (not yet started).
- U5 Playwright harness, four-role projects, support layer, smoke + template spec, README.

**Deferred for later**

- Ricerca lavoratori E2E specs (plan U6).
- Playwright in CI or lefthook.
- `data-testid` rollout across the app (login already has `#login-email` / `#login-password` ids).

**Outside this product's identity**

- Famiglia or lavoratore portal authentication in BazeOffice E2E.
- Vitest Target B giant-file characterization (separate track in `docs/testing-strategy.md`).

## Dependencies / Assumptions

- Docker and the sibling `backend-supabase` repo are available locally.
- Local Supabase publishable and service-role keys are stable enough to hardcode after first `supabase status`, or documented once in `e2e/README.md`.
- Operator seed emails follow a predictable local pattern (e.g. `e2e-<role>@local.test`) with a shared throwaway password.
- `docs/solutions/integration-issues/local-supabase-test-user-and-auth-schema-500.md` patterns apply to all four users.

## Outstanding Questions

**Deferred to Planning**

- Exact seed emails and `operatori` display names for the four users.
- Minimum famiglia / `processi_matching` seed fixture shape for the template spec.
- Whether `e2e:dev` is a separate npm script or an env flag on the existing `e2e` script.
- Service-role key location: committed in `e2e/constants.ts` vs gitignored `e2e/local-secrets.ts` (lean committed for frictionless local runs per R5).

## Sources / Research

- `docs/plans/2026-06-19-001-test-fase1-safety-net-plan.md` — U5, U6, U8, operational runbook.
- `docs/testing-strategy.md` — E2E gap; Target B is Vitest characterization, not this harness.
- `docs/solutions/integration-issues/local-supabase-test-user-and-auth-schema-500.md` — test user seeding and auth-schema drift fix.
- `src/hooks/use-operatori-options.ts` — client-side `ruolo` token normalization.
- `src/components/auth/login-view.tsx` — `#login-email`, `#login-password` selectors.
