# Recupera URL Storage Signed-URL Fallback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Drive recovery fails or is unconfigured, write a 30-day Supabase Storage signed URL to `mesi_lavorati.cedolino_url` and recheck — for both single-card and bulk Recupera URL.

**Architecture:** Implement the fallback inside `baze-supabase` `_shared/cedolini-recover-url.ts` (already shared by `cedolini-recover-url` and `cedolini-bulk-job`). Export bucket/path splitting from the check runner, add a signed-URL helper, reorder recovery so Drive is attempted only after the mese/attachment load, and fall through to Storage on Drive config/upload failure. Sync the FE response contract in `bazeoffice` only (types + comments).

**Tech Stack:** Deno Edge Functions (`@supabase/supabase-js` Storage `createSignedUrl`), TypeScript, Deno.test (`jsr:@std/assert`), Vitest on the FE.

**Spec:** `docs/superpowers/specs/2026-07-28-cedolini-recover-url-storage-fallback-design.md`

## Global Constraints

- Fallback only after Drive missing config **or** Drive upload/share failure — never replace a successful Drive URL.
- Signed URL TTL must be exactly `2_592_000` seconds (30 days).
- Hard fails with **no** Storage fallback: `not_found`, `cedolino_missing`, `download_failed`, `db_error`.
- Single HTTP endpoint: success `200`; all failures including `storage_sign_failed` → `400` (drop `503` for `drive_not_configured`).
- No FE UI copy distinguishing Drive vs Storage; no public-bucket URLs; no auto-renewal.
- Work spans two repos: implement Tasks 1–3 in `/Users/work/Developer/projects/zerocento/baze-supabase`, Tasks 4–5 in `/Users/work/Developer/projects/zerocento/bazeoffice`.

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `baze-supabase/supabase/functions/_shared/cedolini-check-runner.ts` | Export `splitBucketPath` (+ keep `DEFAULT_BUCKET` usable) |
| Modify | `baze-supabase/supabase/functions/_shared/cedolini-recover-url.ts` | Signed-URL helper, reorder flow, Drive→Storage fallback, `source` + `storage_sign_failed` |
| Create | `baze-supabase/supabase/functions/_shared/cedolini-recover-url.test.ts` | Deno unit tests for helper + recovery matrix (mocked supabase / Drive) |
| Modify | `baze-supabase/supabase/functions/cedolini-recover-url/index.ts` | Always `400` on `!recovered`; update comments |
| Modify | `baze-supabase/supabase/functions/cedolini-bulk-job/index.ts` | Include `source` in success `details` (optional but recommended) |
| Modify | `bazeoffice/src/modules/payroll/types/cedolino-bulk-job.ts` | `storage_sign_failed` + optional `source` |
| Modify | `bazeoffice/src/modules/payroll/queries/cedolini-recover-url.ts` | Comment sync |
| Modify | `bazeoffice/src/modules/payroll/hooks/use-cedolini-recover-url.ts` | Comment sync |
| Modify | `bazeoffice/src/modules/payroll/lib/cedolini-edge-function-error.test.ts` | Cover `storage_sign_failed` body parse (400) |

---

### Task 1: Export path split + signed-URL helper (baze-supabase)

**Files:**
- Modify: `supabase/functions/_shared/cedolini-check-runner.ts`
- Modify: `supabase/functions/_shared/cedolini-recover-url.ts`
- Create: `supabase/functions/_shared/cedolini-recover-url.test.ts`

**Interfaces:**
- Consumes: `CedolinoAttachment`, Supabase Storage API
- Produces:
  - `export function splitBucketPath(rawPath: string, defaultBucket: string): { bucket: string; objectPath: string }`
  - `export const CEDOLINO_SIGNED_URL_TTL_SECONDS = 2_592_000`
  - `export type RecoverUrlSource = "drive" | "storage_signed"`
  - `export async function createStorageSignedCedolinoUrl(supabase, attachment, expiresInSeconds?): Promise<{ ok: true; url: string } | { ok: false; message: string }>`

- [ ] **Step 1: Export `splitBucketPath` from the check runner**

In `cedolini-check-runner.ts`, change:

```typescript
function splitBucketPath(rawPath: string, defaultBucket: string): { bucket: string; objectPath: string } {
```

to:

```typescript
export function splitBucketPath(rawPath: string, defaultBucket: string): { bucket: string; objectPath: string } {
```

Also export the bucket constant (or re-declare in recover module — prefer export):

```typescript
export const DEFAULT_CEDOLINO_BUCKET = "baze-bucket";
```

Replace internal `DEFAULT_BUCKET` usages with `DEFAULT_CEDOLINO_BUCKET` (or keep a private alias `const DEFAULT_BUCKET = DEFAULT_CEDOLINO_BUCKET`).

- [ ] **Step 2: Write failing Deno tests for the signed-URL helper**

Create `supabase/functions/_shared/cedolini-recover-url.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert@1";
import {
  CEDOLINO_SIGNED_URL_TTL_SECONDS,
  createStorageSignedCedolinoUrl,
} from "./cedolini-recover-url.ts";

function mockSupabaseForSign(opts: {
  signedUrl?: string | null;
  errorMessage?: string;
  onCreateSignedUrl?: (bucket: string, path: string, expiresIn: number) => void;
}) {
  return {
    storage: {
      from(bucket: string) {
        return {
          createSignedUrl: async (objectPath: string, expiresIn: number) => {
            opts.onCreateSignedUrl?.(bucket, objectPath, expiresIn);
            if (opts.errorMessage) {
              return { data: null, error: { message: opts.errorMessage } };
            }
            return {
              data: opts.signedUrl ? { signedUrl: opts.signedUrl } : null,
              error: null,
            };
          },
        };
      },
    },
  } as unknown as import("https://esm.sh/@supabase/supabase-js@2").SupabaseClient;
}

Deno.test("CEDOLINO_SIGNED_URL_TTL_SECONDS is 30 days", () => {
  assertEquals(CEDOLINO_SIGNED_URL_TTL_SECONDS, 2_592_000);
});

Deno.test("createStorageSignedCedolinoUrl: signs baze-bucket path with 30-day TTL", async () => {
  const calls: Array<{ bucket: string; path: string; expiresIn: number }> = [];
  const supabase = mockSupabaseForSign({
    signedUrl: "https://example.test/sign?token=abc",
    onCreateSignedUrl: (bucket, path, expiresIn) => {
      calls.push({ bucket, path, expiresIn });
    },
  });

  const result = await createStorageSignedCedolinoUrl(supabase, {
    name: "cedolino.pdf",
    path: "baze-bucket/mesi_lavorati/e2e/cedpag-example.pdf",
  });

  assertEquals(result, { ok: true, url: "https://example.test/sign?token=abc" });
  assertEquals(calls, [{
    bucket: "baze-bucket",
    path: "mesi_lavorati/e2e/cedpag-example.pdf",
    expiresIn: 2_592_000,
  }]);
});

Deno.test("createStorageSignedCedolinoUrl: missing path → ok:false", async () => {
  const supabase = mockSupabaseForSign({ signedUrl: "https://example.test/x" });
  const result = await createStorageSignedCedolinoUrl(supabase, { name: "x.pdf" });
  assertEquals(result.ok, false);
});

Deno.test("createStorageSignedCedolinoUrl: storage error → ok:false", async () => {
  const supabase = mockSupabaseForSign({ errorMessage: "Object not found" });
  const result = await createStorageSignedCedolinoUrl(supabase, {
    path: "baze-bucket/mesi_lavorati/missing.pdf",
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.message.includes("Object not found"), true);
  }
});
```

- [ ] **Step 3: Run tests — expect FAIL (exports missing)**

Working directory: `/Users/work/Developer/projects/zerocento/baze-supabase`

```bash
deno test --no-lock --allow-env supabase/functions/_shared/cedolini-recover-url.test.ts
```

Expected: FAIL — `createStorageSignedCedolinoUrl` / `CEDOLINO_SIGNED_URL_TTL_SECONDS` not found.

- [ ] **Step 4: Implement the helper in `cedolini-recover-url.ts`**

Near the top of the shared recover module (after imports), add:

```typescript
import {
  type CedolinoAttachment,
  DEFAULT_CEDOLINO_BUCKET,
  downloadAttachmentBytes,
  processCedolinoCheck,
  splitBucketPath,
} from "./cedolini-check-runner.ts";

export const CEDOLINO_SIGNED_URL_TTL_SECONDS = 2_592_000;

export type RecoverUrlSource = "drive" | "storage_signed";

export async function createStorageSignedCedolinoUrl(
  supabase: SupabaseClient,
  attachment: CedolinoAttachment,
  expiresInSeconds: number = CEDOLINO_SIGNED_URL_TTL_SECONDS,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const path = typeof attachment?.path === "string" ? attachment.path.trim() : "";
  if (!path) {
    return { ok: false, message: "Percorso Storage del cedolino mancante." };
  }

  const { bucket, objectPath } = splitBucketPath(path, DEFAULT_CEDOLINO_BUCKET);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      message: error?.message
        ? `createSignedUrl fallita: ${error.message}`
        : "createSignedUrl non ha restituito un URL.",
    };
  }

  return { ok: true, url: data.signedUrl };
}
```

Extend the result type:

```typescript
export type RecoverErrorCode =
  | "drive_not_configured"
  | "not_found"
  | "cedolino_missing"
  | "download_failed"
  | "upload_failed"
  | "storage_sign_failed"
  | "db_error";

export interface RecoverCedolinoUrlResult {
  recovered: boolean;
  cedolino_url?: string;
  source?: RecoverUrlSource;
  error?: RecoverErrorCode;
  message?: string;
  recheck?: RecoverRecheckOutcome;
}
```

Keep `drive_not_configured` / `upload_failed` on the type for bulk/item diagnostics if needed internally, but they must not be returned as terminal errors after a successful Storage fallback (Task 2).

- [ ] **Step 5: Run helper tests — expect PASS**

```bash
deno test --no-lock --allow-env supabase/functions/_shared/cedolini-recover-url.test.ts
```

Expected: PASS for the four helper tests (recovery-matrix tests may still be absent — add them in Task 2).

- [ ] **Step 6: Commit in baze-supabase**

```bash
git add \
  supabase/functions/_shared/cedolini-check-runner.ts \
  supabase/functions/_shared/cedolini-recover-url.ts \
  supabase/functions/_shared/cedolini-recover-url.test.ts
git commit -m "$(cat <<'EOF'
feat(cedolini): add Storage signed-URL helper for URL recovery

Export bucket/path splitting and a 30-day createSignedUrl helper as the
foundation for Drive→Storage fallback on Recupera URL.
EOF
)"
```

---

### Task 2: Drive→Storage fallback in `recoverCedolinoUrl` (baze-supabase)

**Files:**
- Modify: `supabase/functions/_shared/cedolini-recover-url.ts`
- Modify: `supabase/functions/_shared/cedolini-recover-url.test.ts`

**Interfaces:**
- Consumes: `createStorageSignedCedolinoUrl`, `getDriveServiceAccountCredentials`, `downloadAttachmentBytes`, `uploadCedolinoToDrive`, `recheckMostRecentResult`
- Produces: `recoverCedolinoUrl(supabase, meseLavorativoId, options?)` with optional test seams:

```typescript
export type RecoverCedolinoUrlOptions = {
  uploadToDrive?: (
    credentials: DriveServiceAccountCredentials,
    fileName: string,
    bytes: Uint8Array,
  ) => Promise<string>;
  signAttachmentUrl?: typeof createStorageSignedCedolinoUrl;
  recheck?: (
    supabase: SupabaseClient,
    meseLavorativoId: string,
  ) => Promise<RecoverRecheckOutcome>;
};
```

- [ ] **Step 1: Append failing recovery-matrix tests**

Append to `cedolini-recover-url.test.ts` (mock only what the reordered function needs — `from('mesi_lavorati')` select/update, storage download when Drive path runs, and injected Drive/sign/recheck):

```typescript
import { recoverCedolinoUrl } from "./cedolini-recover-url.ts";

type MeseRow = { id: string; cedolino: Array<{ name: string; path: string }> | null };

function mockRecoverSupabase(args: {
  mese: MeseRow | null;
  downloadOk?: boolean;
  updateError?: string;
}) {
  const updated: Array<{ cedolino_url: string }> = [];
  const supabase = {
    from(table: string) {
      if (table !== "mesi_lavorati") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: args.mese, error: null }),
              };
            },
          };
        },
        update(payload: { cedolino_url: string }) {
          updated.push(payload);
          return {
            eq: async () => ({
              error: args.updateError ? { message: args.updateError } : null,
            }),
          };
        },
      };
    },
    storage: {
      from() {
        return {
          download: async () => {
            if (args.downloadOk === false) {
              return { data: null, error: { message: "not found" } };
            }
            return { data: new Blob([new Uint8Array([1, 2, 3])]), error: null };
          },
        };
      },
    },
  };
  return {
    supabase: supabase as unknown as import("https://esm.sh/@supabase/supabase-js@2").SupabaseClient,
    updated,
  };
}

const meseWithPdf: MeseRow = {
  id: "11111111-1111-1111-1111-111111111111",
  cedolino: [{
    name: "cedolino.pdf",
    path: "baze-bucket/mesi_lavorati/e2e/cedpag-example.pdf",
  }],
};

function withDriveEnv(run: () => Promise<void>): Promise<void> {
  Deno.env.set(
    "DRIVE_SERVICE_ACCOUNT_JSON",
    JSON.stringify({
      client_email: "sa@example.com",
      private_key: "not-used-when-uploadToDrive-injected",
    }),
  );
  Deno.env.set("DRIVE_FOLDER_ID", "folder-123");
  try {
    await run();
  } finally {
    Deno.env.delete("DRIVE_SERVICE_ACCOUNT_JSON");
    Deno.env.delete("DRIVE_FOLDER_ID");
  }
}

Deno.test("recoverCedolinoUrl: Drive ok → source drive", async () => {
  await withDriveEnv(async () => {
    const { supabase, updated } = mockRecoverSupabase({ mese: meseWithPdf, downloadOk: true });
    const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
      uploadToDrive: async () => "https://drive.google.com/file/d/abc/view?usp=drivesdk",
      recheck: async () => ({ applied: false, message: "skip" }),
    });
    assertEquals(result.recovered, true);
    assertEquals(result.source, "drive");
    assertEquals(updated[0]?.cedolino_url.startsWith("https://drive.google.com/"), true);
  });
});

Deno.test("recoverCedolinoUrl: Drive not configured + sign ok → storage_signed", async () => {
  Deno.env.delete("DRIVE_SERVICE_ACCOUNT_JSON");
  Deno.env.delete("DRIVE_FOLDER_ID");
  const { supabase, updated } = mockRecoverSupabase({ mese: meseWithPdf });
  let uploadCalls = 0;
  const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
    uploadToDrive: async () => {
      uploadCalls += 1;
      return "https://drive.google.com/file/d/should-not-run/view";
    },
    signAttachmentUrl: async () => ({
      ok: true as const,
      url: "https://proj.supabase.co/storage/v1/object/sign/cedolino.pdf?token=t",
    }),
    recheck: async () => ({ applied: false, message: "skip" }),
  });
  assertEquals(result.recovered, true);
  assertEquals(result.source, "storage_signed");
  assertEquals(uploadCalls, 0);
  assertEquals(
    updated[0]?.cedolino_url,
    "https://proj.supabase.co/storage/v1/object/sign/cedolino.pdf?token=t",
  );
});

Deno.test("recoverCedolinoUrl: Drive upload throws + sign ok → storage_signed", async () => {
  await withDriveEnv(async () => {
    const { supabase, updated } = mockRecoverSupabase({ mese: meseWithPdf, downloadOk: true });
    const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
      uploadToDrive: async () => {
        throw new Error("Drive 403");
      },
      signAttachmentUrl: async () => ({
        ok: true as const,
        url: "https://proj.supabase.co/storage/v1/object/sign/fallback.pdf?token=t",
      }),
      recheck: async () => ({ applied: false, message: "skip" }),
    });
    assertEquals(result.recovered, true);
    assertEquals(result.source, "storage_signed");
    assertEquals(
      updated[0]?.cedolino_url,
      "https://proj.supabase.co/storage/v1/object/sign/fallback.pdf?token=t",
    );
  });
});

Deno.test("recoverCedolinoUrl: Drive skip + sign fails → storage_sign_failed", async () => {
  Deno.env.delete("DRIVE_SERVICE_ACCOUNT_JSON");
  Deno.env.delete("DRIVE_FOLDER_ID");
  const { supabase, updated } = mockRecoverSupabase({ mese: meseWithPdf });
  const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
    signAttachmentUrl: async () => ({ ok: false as const, message: "boom" }),
    recheck: async () => ({ applied: false, message: "skip" }),
  });
  assertEquals(result, {
    recovered: false,
    error: "storage_sign_failed",
    message: "boom",
  });
  assertEquals(updated.length, 0);
});

Deno.test("recoverCedolinoUrl: cedolino missing → cedolino_missing (no sign)", async () => {
  const { supabase } = mockRecoverSupabase({
    mese: { id: meseWithPdf.id, cedolino: null },
  });
  let signCalls = 0;
  const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
    signAttachmentUrl: async () => {
      signCalls += 1;
      return { ok: true as const, url: "https://example.test/x" };
    },
  });
  assertEquals(result.error, "cedolino_missing");
  assertEquals(signCalls, 0);
});

Deno.test("recoverCedolinoUrl: Drive configured + download fails → download_failed (no sign)", async () => {
  await withDriveEnv(async () => {
    const { supabase } = mockRecoverSupabase({ mese: meseWithPdf, downloadOk: false });
    let signCalls = 0;
    const result = await recoverCedolinoUrl(supabase, meseWithPdf.id, {
      signAttachmentUrl: async () => {
        signCalls += 1;
        return { ok: true as const, url: "https://example.test/x" };
      },
    });
    assertEquals(result.error, "download_failed");
    assertEquals(signCalls, 0);
  });
});
```

- [ ] **Step 2: Run matrix tests — expect FAIL**

```bash
deno test --no-lock --allow-env supabase/functions/_shared/cedolini-recover-url.test.ts
```

Expected: FAIL on recovery tests (current function early-returns `drive_not_configured` / has no `options` / no `source`).

- [ ] **Step 3: Rewrite `recoverCedolinoUrl` body**

Replace the public entry point with this structure (keep Drive helpers above unchanged):

```typescript
export async function recoverCedolinoUrl(
  supabase: SupabaseClient,
  meseLavorativoId: string,
  options: RecoverCedolinoUrlOptions = {},
): Promise<RecoverCedolinoUrlResult> {
  const uploadToDrive = options.uploadToDrive ?? uploadCedolinoToDrive;
  const signAttachmentUrl = options.signAttachmentUrl ?? createStorageSignedCedolinoUrl;
  const recheck = options.recheck ?? recheckMostRecentResult;

  let mese: { id: string; cedolino: unknown } | null;
  try {
    const { data, error } = await supabase
      .from("mesi_lavorati")
      .select("id, cedolino")
      .eq("id", meseLavorativoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    mese = data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { recovered: false, error: "db_error", message: `mesi_lavorati fetch failed: ${message}` };
  }

  if (!mese) {
    return {
      recovered: false,
      error: "not_found",
      message: `mese_lavorativo ${meseLavorativoId} non trovato.`,
    };
  }

  const attachments: CedolinoAttachment[] = Array.isArray(mese.cedolino) ? mese.cedolino : [];
  if (attachments.length === 0) {
    return {
      recovered: false,
      error: "cedolino_missing",
      message:
        "Nessun cedolino allegato in Storage: impossibile recuperare un cedolino_url senza un PDF sorgente.",
    };
  }

  const attachment = attachments[0];
  let cedolinoUrl: string | null = null;
  let source: RecoverUrlSource | null = null;

  const credentials = getDriveServiceAccountCredentials();
  const driveFolderId = (Deno.env.get("DRIVE_FOLDER_ID") || "").trim();

  if (credentials && driveFolderId) {
    const bytes = await downloadAttachmentBytes(supabase, attachment);
    if (!bytes) {
      return {
        recovered: false,
        error: "download_failed",
        message: "Download del cedolino da Storage non riuscito.",
      };
    }
    try {
      const fileName =
        typeof attachment?.name === "string" && attachment.name
          ? attachment.name
          : "cedolino.pdf";
      cedolinoUrl = await uploadToDrive(credentials, fileName, bytes);
      source = "drive";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `cedolini-recover-url: Drive upload failed for ${meseLavorativoId}, falling back to Storage signed URL:`,
        message,
      );
    }
  } else {
    console.warn(
      `cedolini-recover-url: Drive not configured for ${meseLavorativoId}; using Storage signed URL fallback.`,
    );
  }

  if (!cedolinoUrl) {
    const signed = await signAttachmentUrl(supabase, attachment);
    if (!signed.ok) {
      return {
        recovered: false,
        error: "storage_sign_failed",
        message: signed.message,
      };
    }
    cedolinoUrl = signed.url;
    source = "storage_signed";
  }

  const { error: updateError } = await supabase
    .from("mesi_lavorati")
    .update({ cedolino_url: cedolinoUrl })
    .eq("id", meseLavorativoId);

  if (updateError) {
    return {
      recovered: false,
      error: "db_error",
      message: `Scrittura cedolino_url fallita: ${updateError.message}`,
    };
  }

  const recheckOutcome = await recheck(supabase, meseLavorativoId);
  return {
    recovered: true,
    cedolino_url: cedolinoUrl,
    source: source ?? "storage_signed",
    recheck: recheckOutcome,
  };
}
```

Update the module header comment to describe Drive → Storage signed-URL fallback.

Note on `uploadCedolinoToDrive`: it still reads `DRIVE_FOLDER_ID` internally. The outer `driveFolderId` guard prevents calling it when the folder is missing; when tests inject `uploadToDrive`, the real function is not used.

- [ ] **Step 4: Run all recover tests — expect PASS**

```bash
deno test --no-lock --allow-env supabase/functions/_shared/cedolini-recover-url.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit in baze-supabase**

```bash
git add \
  supabase/functions/_shared/cedolini-recover-url.ts \
  supabase/functions/_shared/cedolini-recover-url.test.ts
git commit -m "$(cat <<'EOF'
feat(cedolini): fall back to Storage signed URL on Drive recovery failure

Recupera URL now loads the Storage PDF first, tries Drive when configured,
and writes a 30-day signed URL when Drive is missing or upload fails.
EOF
)"
```

---

### Task 3: HTTP status + bulk details (baze-supabase)

**Files:**
- Modify: `supabase/functions/cedolini-recover-url/index.ts`
- Modify: `supabase/functions/cedolini-bulk-job/index.ts` (success details only)

**Interfaces:**
- Consumes: `RecoverCedolinoUrlResult` including `source`
- Produces: single endpoint always `400` on failure; bulk success details include `source`

- [ ] **Step 1: Update single-endpoint status mapping**

In `cedolini-recover-url/index.ts`, replace the failure branch:

```typescript
  if (!result.recovered) {
    // All structured recovery failures are operator-actionable 400s.
    // Drive-not-configured is no longer terminal — shared recover falls back
    // to a Storage signed URL — so the old 503 path is removed.
    return jsonResponse(result, 400);
  }

  return jsonResponse(result);
```

Update the file-top comment accordingly.

- [ ] **Step 2: Pass `source` through bulk success details**

In `cedolini-bulk-job/index.ts` `processRecoverItem`:

```typescript
  if (result.recovered) {
    return {
      status: "success",
      details: {
        cedolino_url: result.cedolino_url,
        source: result.source,
        recheck: result.recheck,
      },
    };
  }
```

- [ ] **Step 3: Smoke-check TypeScript / Deno compile of the two functions**

```bash
deno check supabase/functions/cedolini-recover-url/index.ts
deno check supabase/functions/cedolini-bulk-job/index.ts
deno test --no-lock --allow-env supabase/functions/_shared/cedolini-recover-url.test.ts
```

Expected: no errors; tests PASS.

- [ ] **Step 4: Commit in baze-supabase**

```bash
git add \
  supabase/functions/cedolini-recover-url/index.ts \
  supabase/functions/cedolini-bulk-job/index.ts
git commit -m "$(cat <<'EOF'
fix(cedolini): drop 503 on recover-url after Storage fallback

Failures from cedolini-recover-url are always 400; bulk recover items
now persist the URL source (drive vs storage_signed) in details.
EOF
)"
```

---

### Task 4: FE contract sync (bazeoffice)

**Files:**
- Modify: `src/modules/payroll/types/cedolino-bulk-job.ts`
- Modify: `src/modules/payroll/queries/cedolini-recover-url.ts`
- Modify: `src/modules/payroll/hooks/use-cedolini-recover-url.ts`
- Modify: `src/modules/payroll/lib/cedolini-edge-function-error.test.ts`

**Interfaces:**
- Consumes: backend response shape from Tasks 2–3
- Produces: updated `RecoverCedolinoUrlErrorCode` / `RecoverCedolinoUrlResponse`

- [ ] **Step 1: Extend types**

In `cedolino-bulk-job.ts`:

```typescript
export type RecoverCedolinoUrlErrorCode =
  | "drive_not_configured"
  | "not_found"
  | "cedolino_missing"
  | "download_failed"
  | "upload_failed"
  | "storage_sign_failed"
  | "db_error"

export type RecoverCedolinoUrlSource = "drive" | "storage_signed"

export type RecoverCedolinoUrlResponse = {
  recovered: boolean
  cedolino_url?: string
  source?: RecoverCedolinoUrlSource
  error?: RecoverCedolinoUrlErrorCode | string
  message?: string
  recheck?: RecoverCedolinoUrlRecheckOutcome
}
```

Re-export `RecoverCedolinoUrlSource` from `src/modules/payroll/types/index.ts` if that barrel lists the recover types explicitly.

- [ ] **Step 2: Update comments on query + hook**

`queries/cedolini-recover-url.ts` — describe flow as:

> Storage PDF → Drive share link when configured → otherwise / on Drive failure a 30-day Storage signed URL → write `cedolino_url` → full recheck.

Remove the implication that `drive_not_configured` is a terminal 503. Note that structured failure bodies still parse via `parseEdgeFunctionErrorBody` on non-2xx (now typically 400).

`hooks/use-cedolini-recover-url.ts` — mention Storage fallback; keep bulk error surfacing as-is (`storage_sign_failed` messages flow through `details.message`).

- [ ] **Step 3: Add FE parser test for `storage_sign_failed`**

Append to `cedolini-edge-function-error.test.ts`:

```typescript
  it("estrae storage_sign_failed da un 400 strutturato", () => {
    const error = new Error(
      'Edge function \'cedolini-recover-url\' failed (400): {"recovered":false,"error":"storage_sign_failed","message":"createSignedUrl fallita: Object not found"}',
    )
    expect(parseEdgeFunctionErrorBody(error)).toEqual({
      recovered: false,
      error: "storage_sign_failed",
      message: "createSignedUrl fallita: Object not found",
    })
  })
```

Keep the existing `503` / `drive_not_configured` test — parsing must still work for older deployed backends.

- [ ] **Step 4: Run FE unit gate for touched tests**

Working directory: `/Users/work/Developer/projects/zerocento/bazeoffice`

```bash
npm run test -- src/modules/payroll/lib/cedolini-edge-function-error.test.ts
npx tsc -b --pretty false
```

Expected: PASS / no TS errors.

- [ ] **Step 5: Commit in bazeoffice**

```bash
git add \
  src/modules/payroll/types/cedolino-bulk-job.ts \
  src/modules/payroll/types/index.ts \
  src/modules/payroll/queries/cedolini-recover-url.ts \
  src/modules/payroll/hooks/use-cedolini-recover-url.ts \
  src/modules/payroll/lib/cedolini-edge-function-error.test.ts
git commit -m "$(cat <<'EOF'
feat(payroll): sync Recupera URL types for Storage signed-URL fallback

Add storage_sign_failed / source to the recover-url contract and document
Drive→Storage fallback on the FE call path.
EOF
)"
```

---

### Task 5: Deploy note + manual verification checklist

**Files:** none required (checklist only). If the team keeps ops notes in-repo, optionally append a short note under the existing cedolini plan — skip unless asked.

- [ ] **Step 1: Deploy backend before relying on FE**

Deploy / serve updated edge functions from `baze-supabase`:

- `cedolini-recover-url`
- `cedolini-bulk-job` (only if Task 3 bulk `source` detail change is included; shared recover code is bundled into both)

- [ ] **Step 2: Manual smoke (staging)**

1. Pick a Controlli card in **Cedolino o PDF** with PDF attached and empty `cedolino_url`, on an env **without** Drive secrets.  
2. Click **Recupera URL**.  
3. Expect success toast/state, card leaves the warning group after recheck (or `cedolino_url` non-empty).  
4. Open `cedolino_url` — Supabase signed URL downloads/views the PDF.  
5. Repeat via **Recupera URL (blocco)** for ≥2 cards.

- [ ] **Step 3: No commit** unless you added an ops note file.

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Fallback only on Drive missing config / upload failure | Task 2 |
| Signed URL, TTL 30 days (`2_592_000`) | Task 1–2 |
| Shared module (single + bulk) | Task 2–3 |
| Hard fails: not_found / cedolino_missing / download_failed / db_error | Task 2 tests |
| `storage_sign_failed` + `source` | Task 1–2, FE Task 4 |
| HTTP 200 / 400; drop 503 | Task 3 |
| FE types/comments only | Task 4 |
| Backend + FE tests | Tasks 1–2, 4 |
| Out of scope (renewal, public URL, UI distinction) | Not scheduled |

## Placeholder scan

No TBD/TODO steps. Test seams (`RecoverCedolinoUrlOptions`) are fully typed in Task 2.
