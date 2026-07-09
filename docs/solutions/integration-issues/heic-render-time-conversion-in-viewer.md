---
title: "HEIC/HEIF images render broken in the viewer — decode to JPEG in the browser at a shared render seam"
date: 2026-07-09
category: docs/solutions/integration-issues
module: Attachment/image viewer (shared-next, lavoratori)
problem_type: integration_issue
component: frontend
symptoms:
  - "iPhone-default .HEIC/.HEIF documents/photos show as a broken image; reported as a '404' / 'documento rotto'"
  - "Storage returns HTTP 200 with the bytes, but desktop Chrome/Firefox cannot decode HEIC in an <img>"
  - "The .heic extension was excluded by the image-detection regex, so HEIC got no preview at all"
root_cause: browser_incompatibility
resolution_type: library_integration
severity: medium
related_components: [supabase_storage, external_upload_pipelines]
tags: [heic, heif, image, attachment, viewer, heic-to, object-url, lazy-import, code-splitting, fallback, render-time]
---

# HEIC/HEIF images render broken in the viewer — decode to JPEG in the browser at a shared render seam

## Problem

`.HEIC`/`.HEIF` files (the iPhone default photo format) do not display in Baze Office. The viewer renders stored images with a plain `<img>` on the Supabase Storage public URL; Storage returns the bytes (HTTP 200), but desktop browsers cannot decode HEIC in an `<img>`, so the document appears broken. Reported as a "404", but it is a **browser decode failure**, not a missing object. (BAZ-21)

## Symptoms

- A worker document or profile foto uploaded as `.heic` shows a broken-image icon.
- Intermittent: iOS sometimes transcodes to JPEG on web upload and sometimes does not.
- `isImageUrl` (extension regex) excluded `.heic`, so HEIC files were not even offered as a preview — just a generic file icon.

## What Didn't Work (considered and rejected)

- **Storage-side conversion (an Edge Function on a `storage.objects` insert trigger that converts in place).** Architecturally cleaner (convert once at rest, covers every pipeline), but rejected: it adds infrastructure and carries an **unverified feasibility risk** — decoding a 12MP HEIC inside a Supabase Edge Function's CPU/memory limits (Deno + libheif-WASM). See ADR `docs/adr/0001-heic-conversione-a-render.md` (workspace root).
- **Convert at upload in the app only.** Rejected: files enter Storage from **external, unowned pipelines** (a Make.com scenario, the Webflow onboarding webapp) that keep producing HEIC. A per-uploader fix would not cover them, nor the files already in Storage.
- **`heic2any` (the most-downloaded browser HEIC library).** Rejected: unmaintained (v0.0.4, 2023), ships a pre-1.18 libheif, and **crashes / returns black images on modern iPhone iOS 17/18 HEIC** — exactly the files in scope (its issues #61/#63/#50). It also mislabels its license.

## Solution

Convert HEIC/HEIF to JPEG **in the browser, at render time**, behind a single shared seam. Render-time is source-agnostic: it fixes files already in Storage and future files from any pipeline, with no backfill.

**1. One decode module, the only importer of the decoder** (`src/lib/heic-image.ts`):

```ts
// Detection is sync, by extension OR MIME (Make/webapp files may lack the extension).
export function isHeicImage({ url, type }) { /* /\.(heic|heif)/i on url, /^image\/hei[cf]$/i on type */ }

export function getRenderableImageSrc(url, type) {
  if (!isHeicImage({ url, type })) return Promise.resolve(url)   // passthrough — no import, no fetch
  const cached = cache.get(url)
  if (cached) { cache.delete(url); cache.set(url, cached); return cached }  // LRU bump-on-hit
  const pending = convert(url)                                   // lazy: import("heic-to") inside convert()
  cache.set(url, pending)
  pending.catch(() => { if (cache.get(url) === pending) cache.delete(url) })  // drop on failure → retry
  // evict oldest past the cap, revoking its object URL
  return pending
}

async function convert(url) {
  const { heicTo } = await import("heic-to")           // code-splits the ~735 KB WASM decoder off the initial bundle
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)   // a hung fetch must not spin forever
  try { var response = await fetch(url, { signal: controller.signal }) } finally { clearTimeout(timeout) }
  if (!response.ok) throw new Error(...)
  const jpeg = await heicTo({ blob: await response.blob(), type: "image/jpeg", quality: 0.85 })
  return URL.createObjectURL(jpeg)                      // cached; revoked on eviction
}
```

**2. One shared component** (`src/components/shared-next/attachment-image.tsx`) with `loading | ready | error` states. It replaced the raw `<img>` at every in-scope surface — the attachment thumbnail slot (`attachment-upload-slot.tsx`), the preview modal (`documents-card.tsx`), and the worker profile foto carousel (`worker-profile-*.tsx`) — so the fix lands in one place and cannot drift per-surface. Detection was widened at the seam: `isDisplayableImage = isImageUrl(url) || isHeicImage({url,type})` so HEIC counts as previewable.

**3. Graceful fallback, on BOTH failure paths** (the review-caught gotcha, see below): on decode rejection AND on `<img> onError`, degrade to a filename + download/open link, never a broken image.

## Why This Works

The browser decodes JPEG natively; `heic-to` (libheif 1.22.2 compiled to WASM) decodes the HEIC to a JPEG `Blob`, and `URL.createObjectURL` gives a `blob:` URL the `<img>` can paint. Because conversion happens at display time, it is agnostic to how the file reached Storage — old files and files from external pipelines all work in the office, with zero data/storage changes. The lazy `import("heic-to")` keeps the heavy WASM chunk out of the initial bundle (verified: it builds as a separate ~737 KB gz chunk, loaded only when a HEIC is shown).

## Prevention

- **A "graceful fallback" must cover the synchronous `<img>` load path, not only the async decode.** The first implementation reached the fallback only when the decode promise rejected. A `ready`-state `<img>` (both the passthrough and post-conversion cases) had no `onError`, so a 404, a revoked blob URL, or a mis-classified HEIC still rendered a broken image — silently defeating the component's whole promise. **Add `onError` to any `<img>` whose "never broken" behavior you rely on.**
- **For format-decoder libraries, pick the maintained one, not the popular one.** Verify last-release date and that the bundled native engine (here libheif ≥ 1.18) handles current device output before adopting. Download count is a trailing signal.
- **Object-URL cache lifecycle:** revoking on eviction frees memory but can revoke a blob a mounted `<img>` still shows. Mitigate with LRU bump-on-hit (don't evict the actively-viewed entry) **and** the `onError` fallback (degrade if it happens anyway). Cache the *promise* (not the value) to de-dup concurrent requests for the same URL.
- **Always give a client-side `fetch()`-then-decode an `AbortController` timeout** — a hung request never settles, and a promise-keyed cache then shares that permanent hang with every consumer of the URL.
- **Centralize at one seam.** Replacing N scattered `<img>` sites with one component is what makes "fix it once" true and keeps behavior from drifting per surface.
- **Testing:** mock `heic-to` at the module boundary (the single importer) so unit tests never run real WASM; assert the three states per surface (loading / converted / fallback) plus the non-HEIC passthrough. See `heic-image.test.ts`, `attachment-image.test.tsx`.

## References

- Plan: `docs/plans/2026-07-09-001-fix-heic-viewer-render-plan.md`
- ADR (render-time vs storage-side): `docs/adr/0001-heic-conversione-a-render.md` (workspace root)
- Linear: BAZ-21
- Known follow-up: the foto carousel passes no `type` prop, so HEIC detection there is extension-only (covered by the `onError` fallback; proper fix threads the MIME type through `presentationPhotoSlots`).
