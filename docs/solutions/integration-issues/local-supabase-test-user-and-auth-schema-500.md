---
title: "Local Supabase dev/E2E: seeding a login-capable test user and the 'Database error querying schema' 500"
date: 2026-06-19
category: docs/solutions/integration-issues
module: Local dev environment (Supabase auth)
problem_type: integration_issue
component: authentication
symptoms:
  - "Login token endpoint returns HTTP 500 'Database error querying schema' even though the user row exists and is email-confirmed"
  - "supabase start warns of GoTrue version skew and boots 'Starting database from backup'"
  - "A user inserted only into auth.users (no auth.identities row) cannot log in"
root_cause: incomplete_setup
resolution_type: environment_setup
severity: medium
related_components: [database, development_workflow, testing_framework]
tags: [supabase, local-dev, auth, gotrue, seed, test-user, db-reset, e2e]
---

# Local Supabase dev/E2E: seeding a login-capable test user and the "Database error querying schema" 500

## Problem

Standing up the local Supabase stack so `npm run dev` (and later Playwright E2E)
runs against it with a seeded test user. Two non-obvious blockers: creating a
test user that can actually log in, and a GoTrue 500 ("Database error querying
schema") on every login attempt.

## Symptoms

- `POST /auth/v1/token?grant_type=password` returns
  `{"code":500,"error_code":"unexpected_failure","msg":"Database error querying schema"}`
  even though the `auth.users` row exists and `email_confirmed_at` is set.
- `supabase start` warns `supabase/gotrue:vA => vB` (version skew vs the linked
  project) and logs `Starting database from backup...`.
- A user inserted into `auth.users` alone never authenticates.

## What Didn't Work

- **Inserting only into `auth.users`** (with a correct bcrypt password and
  `email_confirmed_at`): the row exists and is confirmed, but login still fails.
  GoTrue authenticates against `auth.identities`; with no matching identity row
  the login fails silently.
- **Re-running `supabase start`** to "refresh" the stack: it boots the same
  persisted DB volume ("from backup"), so the drifted `auth` schema — and the
  500 — survive the restart.

## Solution

1. **Seed the test user reproducibly** in a dedicated, idempotent file
   (`backend-supabase/supabase/seed_test_user.sql`) wired into `config.toml`:

   ```toml
   [db.seed]
   sql_paths = ["./seed.sql", "./seed_test_user.sql"]
   ```

   The seed inserts BOTH rows (idempotent guard on the email), password hashed
   with pgcrypto:

   ```sql
   insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
   values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
     'authenticated', 'test@usuario.com', crypt('password123', gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

   insert into auth.identities (provider_id, user_id, identity_data, provider,
     last_sign_in_at, created_at, updated_at)
   values (v_uid::text, v_uid,
     jsonb_build_object('sub', v_uid::text, 'email', 'test@usuario.com', 'email_verified', true),
     'email', now(), now(), now());
   ```

2. **Fix the 500 with `supabase db reset`, not `supabase start`.** Reset rebuilds
   the local database from migrations, so the `auth` schema is regenerated to
   match the running GoTrue — clearing the drift inherited from the backup
   volume. It also re-runs every `sql_paths` entry, provisioning the test user.

3. **Point the frontend at local** via a gitignored `.env.local` (it overrides
   `.env` for `npm run dev`), using the **publishable** key as the anon key:

   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=sb_publishable_...        # from `supabase status`
   VITE_SUPABASE_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
   ```

Verify end-to-end:

```bash
curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: <publishable-key>" -H "Content-Type: application/json" \
  -d '{"email":"test@usuario.com","password":"password123"}'
# -> HTTP 200 with an access_token
```

## Why This Works

- **The 500 is auth-schema drift.** GoTrue fails to query an `auth` schema that
  doesn't match the version it expects. `supabase start` reuses the persisted DB
  volume, so a schema migrated by a different GoTrue/CLI version stays stale.
  `supabase db reset` drops and rebuilds the DB, regenerating `auth` to match the
  running services.
- **GoTrue needs `auth.identities`, not just `auth.users`.** A user with no
  identity row is unauthenticatable from GoTrue's perspective, so the two-row
  insert is mandatory.
- **New key format.** Recent Supabase CLI replaced the classic `anon` /
  `service_role` JWT keys with `sb_publishable_...` / `sb_secret_...`.
  supabase-js accepts the publishable key as the client key, so it goes in
  `VITE_SUPABASE_ANON_KEY`.
- **No email round-trip locally.** `[auth.email] enable_confirmations = false`
  means a user with `email_confirmed_at` set logs in without confirming.

## Prevention

- Seed login-capable users from a versioned seed file (both `auth.users` +
  `auth.identities`, idempotent) wired into `[db.seed].sql_paths`, so
  `supabase db reset` always reproduces them. Keep it a **local seed, never a
  migration** — it must not reach staging/prod.
- When local auth breaks after a CLI upgrade or a "from backup" start, reach for
  `supabase db reset` before deeper debugging — schema drift is the usual cause.
- Keep local env in `.env.local` (gitignored), not in committed `.env`; Vite
  layers `.env.local` over `.env` for `npm run dev`.
- Throwaway local creds (`test@usuario.com` / `password123`) are safe to commit
  in the seed; a captured session `storageState` token is not — gitignore it.

## Related

- `docs/plans/2026-06-19-001-test-fase1-safety-net-plan.md` — U8 (local
  environment) and U5/U6 (Playwright E2E) that depend on this setup.
- `docs/testing-strategy.md`
