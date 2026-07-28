---
date: 2026-07-28
topic: cedolini-recover-url-storage-fallback
type: feature
status: approved
origin: brainstorming — Recupera URL Drive failure → Supabase Storage signed URL
repos:
  - baze-supabase (primary)
  - bazeoffice (FE contract sync)
---

# feat: Recupera URL Storage signed-URL fallback

## Summary

When Controlli’s **Recupera URL** cannot produce a Google Drive share link (missing Drive secrets or Drive upload/share failure), fall back to a **Supabase Storage signed URL** (TTL **30 days**) for the existing `cedolino` attachment, write it to `mesi_lavorati.cedolino_url`, and run the same full recheck as today.

Primary implementation lives in `baze-supabase` shared recovery logic so single-card and bulk `recover_url` stay on one path. `bazeoffice` only syncs the response contract (types/comments).

## Decisions

| Topic | Choice |
|-------|--------|
| When Storage is used | Fallback only — after Drive missing config **or** Drive-side upload/share failure |
| URL kind | Signed URL via `storage.createSignedUrl` |
| TTL | 30 days (`2_592_000` seconds) |
| Where | `_shared/cedolini-recover-url.ts` (single + bulk) |
| Hard fails (no fallback) | `not_found`, `cedolino_missing`, `download_failed`, `db_error` |

## Flow

```
load mesi_lavorati + cedolino attachment
  → hard fail: not_found | cedolino_missing | download_failed | db_error
try Drive (if credentials + DRIVE_FOLDER_ID present)
  → success: Drive share URL, source = "drive"
  → missing config OR upload/share failure: fall through
fallback: createSignedUrl(bucket, objectPath, 2_592_000)
  → success: signed URL, source = "storage_signed"
  → failure: storage_sign_failed
write mesi_lavorati.cedolino_url
full recheck (unchanged)
return { recovered: true, cedolino_url, source, recheck }
```

Reorder vs today: do **not** early-return on missing Drive secrets before loading the attachment. Drive config is checked only at the Drive attempt.

Reuse existing bucket/path splitting from `cedolini-check-runner` (`baze-bucket` + object path) for the signed-URL call. Prefer signing without re-downloading when Drive was skipped for config; download still required for Drive upload when Drive is attempted.

## API contract

### Success

```ts
{
  recovered: true
  cedolino_url: string
  source: "drive" | "storage_signed"
  recheck?: { applied: boolean; status?: "ok" | "warning" | "error"; message?: string }
}
```

`source` is additive; existing FE may ignore it.

### Failure

Existing hard-fail codes unchanged. New terminal code when Drive failed/skipped **and** signing fails:

- `storage_sign_failed`

`drive_not_configured` and `upload_failed` are **not** terminal when the Storage fallback succeeds. They should not be returned to the client after a successful fallback.

### HTTP (single `cedolini-recover-url`)

| Outcome | Status |
|---------|--------|
| Recovered (Drive or Storage) | `200` |
| Hard fail / `storage_sign_failed` | `400` |

Drop the special `503` for `drive_not_configured` once fallback ships — that path should recover via Storage (or return `storage_sign_failed` as `400`).

Bulk `cedolini-bulk-job` `kind: "recover_url"` continues to call the same shared function; item success/failure semantics unchanged aside from the new success path and error code.

## FE (`bazeoffice`)

- Extend `RecoverCedolinoUrlErrorCode` with `storage_sign_failed`
- Optionally type `source` on `RecoverCedolinoUrlResponse`
- Update comments on recover-url query/hook (Drive → Storage fallback)
- No UI copy/toast distinguishing Drive vs Storage in this change

## Tests

**Backend (`baze-supabase`)**

- Drive configured + upload ok → `source: "drive"`
- Drive not configured + sign ok → `source: "storage_signed"`
- Drive upload throws + sign ok → `source: "storage_signed"`
- Drive skip/fail + sign fails → `storage_sign_failed`
- Missing / undownloadable PDF → hard fail (no sign attempt that invents a URL)

**FE (`bazeoffice`)**

- Type / error-parser coverage if it enumerates recover error codes
- E2E: no required change if recover already exercises the endpoint once backend is deployed

## Out of scope

- Auto-renewal of expired signed URLs after 30 days
- Public bucket URLs / permanent Storage links
- FE UI distinguishing Drive vs Storage
- Controlli check changes beyond non-empty `cedolino_url`
- Provisioning Google Drive secrets (fallback exists so recovery works without them)

## Implementation notes

- Primary file: `baze-supabase/supabase/functions/_shared/cedolini-recover-url.ts`
- Callers unchanged in shape: `cedolini-recover-url/index.ts`, `cedolini-bulk-job` recover_url branch
- FE sync: `src/modules/payroll/types/cedolino-bulk-job.ts` (+ related comments)
