---
title: "HEIC/HEIF images render broken in the viewer — decode to JPEG in the browser at a shared render seam"
date: 2026-07-09
last_updated: 2026-07-10
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
tags: [heic, heif, image, attachment, viewer, heic-to, object-url, lazy-import, code-splitting, fallback, render-time, avatar, mime-vs-extension, design-system-primitive]
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

## Follow-up: the shared `Avatar` primitive was a missed surface (BAZ-21, #62)

The first pass centralized at a seam — but only for the surfaces that rendered through a raw `<img>`. The **worker avatar** renders through a *different* component: the design-system `Avatar` (`@/components/ui/avatar`, a Radix `<img>`), used by the `cerca-lavoratori` list card and the two profile overview/header **fallback** avatars. `AttachmentImage` was never wired there, so HEIC avatars still fell back to initials in production.

- **Lesson — enumerate every render path, including shared primitives.** "Centralize at one seam" fixes drift only among the sites you actually route through it. A fix framed as "this format, everywhere" must inventory *every* component that paints the media; a design-system primitive is the easy miss because it isn't one of the call sites you edited.
- **Lesson — MIME beats the extension for pipeline-sourced files.** The avatar chain passed only a URL string, so detection was extension-only there. Production data: of ~265 HEIC avatars, **42 carry no `.heic` in the URL at all** (opaque onboarding-pipeline filenames) — extension detection can never reach them; the stored `type: image/heic` MIME does. `isHeicImage` already prefers MIME — the gap was that the avatar view-models **discarded** the MIME that `normalizeAttachmentItem` already preserves.

**Fix — thread the MIME, keep the primitive pure:**

- `toAvatarImage(row)` now returns `{ url, type }` (was `toAvatarUrl` → just the url); the worker view-models carry a new optional `immagineType` beside `immagineUrl`.
- A new `HeicAwareAvatar` **wraps** `Avatar` rather than making the design-system primitive depend on `heic-to`. It resolves a renderable src via a headless `useRenderableImageSrc(src, type)` hook (the same `getRenderableImageSrc` engine); on decode failure `Avatar` keeps its **initials** fallback — the right fallback for an avatar, not the viewer's download link. Non-HEIC = synchronous passthrough at zero cost, `heic-to` stays lazy.
- Detection stays **MIME-first, extension-fallback** (the fallback still recovers ~7 prod avatars that have a `.heic` extension but a missing/wrong MIME).

Files: reuses `src/lib/heic-image.ts`; adds `src/components/shared-next/use-renderable-image-src.ts` + `src/components/shared-next/heic-aware-avatar.tsx` (the generic `HeicAwareAvatar` wrapper); edits `base-utils.ts` (`toAvatarImage`), `lavoratore-card.tsx`, `worker-profile-{overview,header}.tsx`, and the 3 ricerca view-model builders. Scope: avatar surfaces only — the foto **carousel** remains extension-only (it still passes no `type`; see the known follow-up below).

## References

- Plan: `docs/plans/2026-07-09-001-fix-heic-viewer-render-plan.md`
- ADR (render-time vs storage-side): `docs/adr/0001-heic-conversione-a-render.md` (workspace root)
- Linear: BAZ-21
- Known follow-up: the foto carousel passes no `type` prop, so HEIC detection there is extension-only (covered by the `onError` fallback; proper fix threads the MIME type through `presentationPhotoSlots`).
