---
standards-version: 1.0.0
profile: nextjs-fe-api
---

# AGENTS.md

Guidance for AI agents and developers working in this repository. The engineering
standards below are a condensed summary of a versioned standards pack — they are the
house rules; follow them for all new code.

> ⚠️ **Read the Project specifics → Architecture override first.** This repo is a
> browser-only SPA over Supabase, not a Next.js app with a server. The `nextjs-fe-api`
> profile is stamped for its **module anatomy** (the `*.api.ts` / `*.adapters.ts`
> structure); its server-side-token rules are **explicitly overridden** below.

## Engineering standards (v1.0.0, profile: nextjs-fe-api)

### Module Anatomy

- Business logic lives in feature modules: `src/modules/<feature>/`.
- `<feature>.service.ts` is the **only public entry point**. It owns business logic
  AND authorization — verify access rights before returning cross-user data.
- `<feature>.repository.ts` is the **only file that touches the data source**
  (DB query builder, or HTTP client in API-client apps). It is **never exported**
  from the module.
- `index.ts` exports service, types, schemas, errors — never the repository.
- Consumers import from the module root only: `import { xService } from "@/modules/x"`.
  Deep imports into module internals are drift.
- New features follow this anatomy even in repos whose older code does not.
  Never bulk-migrate legacy code as a side effect of feature work.

### Code Quality

- **Single responsibility**: one file = one concern; one function = one job. If you
  need "and" to describe a function, split it.
- **Pure functions by default**: business logic and transformations are pure
  (inputs → output, no I/O, no hidden state). Side effects live at the edges
  (service methods, handlers) and are named like effects (`sendX`, `persistX`).
- **Strict TypeScript**: `strict: true`, no `any` (use `unknown` + narrowing),
  handle indexed access (`noUncheckedIndexedAccess` where enabled).
- **Zod is the validation canon** — one schema library per repo, no Yup/Joi in new code.
- **Files**: kebab-case (`user-avatar.tsx`, `safe-action.ts`).
  **Components**: PascalCase. **Hooks**: `useX`. **Constants**: SCREAMING_SNAKE_CASE.
  **Variables/functions**: camelCase.
- **Type imports separated**: `import type { User } from ...`.
- No dead code, no commented-out code, no `console.log` left behind (use the
  project's logger).

### Testing

The definition of done for any feature includes:

- [ ] Every service behavior (each public service method's happy path + its
      authorization/error paths) has an **integration test against a real local
      PostgreSQL container** — in apps that own a DB.
- [ ] Every critical user flow touched by the feature has a **Playwright E2E test**.
- [ ] **Real infrastructure in tests**: real DB, real app server. Mock **only
      external third parties** (Stripe, Cal.com, email, analytics). Never mock your
      own DB or your own API in integration/E2E tests.
- [ ] In apps without a DB (FE-over-API, mobile): adapters and other pure logic get
      unit tests; flows get E2E tests; the API layer is exercised against the real
      backend in a test environment when available.
- [ ] No coverage % gates. A feature without its checklist tests is not done; a repo
      at 60% coverage with this checklist green is fine.
- [ ] Interactive elements carry test IDs: `data-testid="[context]-[element]-[id]"`
      (e.g., `login-input-email`) on form inputs, submit buttons, nav links, primary
      CTAs, modal triggers.

### Git & PR Conventions

- **Conventional commits**: `<type>(<scope>): <subject>` — types: `feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- **Never add AI co-author/attribution lines** to commits or PRs. No
  `Co-Authored-By: Claude...`, no "Generated with..." footers.
- **Small, single-concern PRs**: aim < 400 changed lines; don't mix features with
  refactors or fixes.
- PR title = conventional commit format. PR body answers **What / Why / How /
  Testing**, with screenshots for UI changes.
- Commit only what you touched for the unit of work — no `git add .` sweeps that
  drag in unrelated files.
- Never commit secrets or `.env*` files; never commit directly to the default
  branch.

### Profile: Next.js FE over API

- **All backend calls happen server-side** — in `'use server'` actions or route
  handlers. Auth tokens are attached there from the server session.
  **Raw tokens never appear in browser-executed code, cookies readable by JS, or
  TanStack Query fetchers.**
- One central API client (`fetchFromAPI`-style) owns base URL, token attachment,
  timeouts, and error normalization. Features never call `fetch`/`axios` directly.
- **Server actions are independently invocable from the client — treat them as public
  endpoints.** Bind every action to the session identity (IDOR guard): never trust a
  caller-supplied email/id as authorization; refuse on mismatch.
- Feature anatomy: `<f>.actions.ts` ('use server') → `<f>.api.ts` (namespaced
  surface) → `<f>.adapters.ts` (single normalization boundary) →
  `<f>.queries.ts` / `<f>.mutations.ts` (TanStack wrappers) → components/hooks.
- Validate API responses against Zod schemas at the boundary; report mismatches
  (log/monitoring), don't silently coerce.
- Adapters are the **only** place legacy/denormalized backend field names appear.

## Project specifics

<!-- project:start — this section is owned by the project; the generator never rewrites it -->

### Architecture override (read before the profile rules)

BazeOffice is a **browser-only React SPA** (Vite, no application server). All data and
business logic live in the separate Supabase backend (`Bazeapp/backend-supabase`); this
repo reads/writes **exclusively** through its RPCs and Edge Functions. Deploy is to
GitHub Pages — a **production** and a **staging** environment, each wired to its own
Supabase instance.

Consequences — these **override** the `nextjs-fe-api` profile where they conflict:

- **No `'use server'`, no server actions, no server session.** The Supabase client runs
  in the browser. The `VITE_SUPABASE_ANON_KEY` is **public by design**; access control
  is enforced by **Supabase Row-Level Security (RLS)**, not by hiding the key.
- **Module anatomy applies in its API-client variant.** Per feature/domain:
  - `<domain>.api.ts` — the **only** file that calls Supabase for that domain (internal,
    never exported). Plays the repository role.
  - `<domain>.adapters.ts` — the **only** place Supabase row/field names appear; the
    rest of the app sees normalized domain types. (This is also the seam that makes the
    planned DB-field cleanup safe and local.)
  - `<domain>.queries/` / `mutations/` — one fetch/mutation per file; thin re-exports
    from `<domain>.api.ts`.
  - `<domain>.types.ts`, `lib/` (pure utils), `components/`, `hooks/`, `__tests__/`.
  - Consumers import from `index.ts` only (`@/modules/<dominio>`).
- **Eight domain modules** under `src/modules/`: `anagrafiche` (AgGrid CRUD UI shell),
  `support`, `crm`, `lavoratori`, `ricerca`, `gestione-contrattuale`, `rapporti`,
  `payroll`. Entity table CRUD lives in the **home module**; the `anagrafiche` module
  renders tabs and imports queries from home barrels (e.g. `fetchLavoratori` from
  `@/modules/lavoratori`). ESLint blocks deep imports of `*.api.ts` / `*.adapters.ts`
  across module boundaries.
- **Shared Supabase infra** in `src/lib/`: `write-tracking`, `record-crud`, `table-query`
  (Anagrafiche chokepoint only), `lookup-values`, `indirizzi-api`, etc. — not the
  dissolved `anagrafiche-api.ts` monolith.
- **Testing tier:** no local DB to integration-test. Adapters and pure logic → Vitest
  unit tests; hooks → black-box tests with the data layer mocked at the module boundary;
  critical flows → E2E. Stack: **Vitest + happy-dom + Testing Library** (E2E not yet set
  up). Gate runs in two places: **lefthook** pre-push (local first line of defense) and
  **GitHub Actions** (`.github/workflows/ci.yml`) on every PR to `main`/`staging`/`dev` —
  same checks (`test` + `tsc` + `lint`). CI is what protects `main`; the local hook can be
  bypassed with `LEFTHOOK=0`, CI cannot.
- This is a **legacy-but-in-production** codebase mid-stabilization. New work follows the
  module anatomy above; **do not bulk-migrate** remaining legacy `components/` or `hooks/`
  outside modules. See `docs/piano-stabilizzazione.md` (master plan) and
  `docs/testing-strategy.md` (test safety net) before refactoring.

### Commands

```bash
npm run dev                  # Vite dev server
npm run dev:nostrict         # dev server with React StrictMode disabled
npm run build                # tsc -b && vite build
npm run lint                 # eslint .
npm run test                 # vitest run (the pre-push gate)
npm run coverage             # vitest run --coverage (coverage = a map, not a gate)
npm run test:watch           # vitest (watch mode)
npm run test:unit            # vitest run, excludes *.integration.test.*
npm run test:integration     # vitest run, only *.integration.test.*
npm run storybook            # storybook on :6006
npm run audit:lookup         # report Supabase lookup-table usage
npm run audit:autosave       # autosave/draft risk analysis (add :strict for stricter)
```

> Coverage provider (`@vitest/coverage-v8`) is installed (Phase 0). Use `npm run coverage`
> as a **map** of what the safety net does/doesn't cover — never as a % target to chase
> (see Anti-pattern in `docs/piano-stabilizzazione.md`).

### Environment

Set in `.env` (see `.env.example`); all client-exposed (`VITE_` prefix). **Names only —
never commit values.**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` — public anon key; security is via RLS, not secrecy
- `VITE_SUPABASE_FUNCTIONS_URL`

### Domain notes

Italian HR/staffing platform for the domestic-work market. The lifecycle the app covers:
**Lead → CRM → recruiter assignment → worker search → interviews → hiring → active
contract → payroll → variations/closures → reactivations → support.** Domains map to the
module candidates: `lavoratori`, `ricerca`, `crm`, `gestione-contrattuale`, `payroll`,
`rapporti`, `anagrafiche`, `support`.

Branching: `main` = production (protected, PR-only deploy), `staging`, `dev`. Work on
`dev`; hotfix from `main` then forward-port to `dev`.

### Knowledge Store

`docs/solutions/` — solved-problem library, one Markdown file per issue, with YAML
frontmatter (`problem_type`, `component`, `severity`, `tags`). Subdirectory categories:
`integration-issues/`, `architecture/`, etc. **Read before implementing or debugging in a
documented area** — past failures and their root causes are indexed here so the same
investigation is never repeated. Companion: `docs/testing-strategy.md` for test coverage
decisions, `docs/piano-stabilizzazione.md` for the overall stabilisation plan.

`CONCEPTS.md` (repo root) — shared domain vocabulary (entities, named processes, status
concepts); relevant when orienting to the codebase or discussing domain concepts.

<!-- project:end -->
