---
date: 2026-07-09
topic: baz-21-heic-render-conversion
title: HEIC render-time conversion in the Baze Office viewer
linear: BAZ-21
tier: 2
repo: bazeoffice
---

# HEIC render-time conversion in the Baze Office viewer

## Summary

Decode HEIC/HEIF images to a browser-renderable format in the browser, at the moment Baze Office renders them, using the `heic-to` library loaded lazily only when a HEIC is present. Centralize it at the shared image-rendering seam so every office surface that shows a stored image — document previews, attachment thumbnails, and the worker profile foto — displays HEIC correctly, including files already in storage, with no data or storage changes.

## Problem Frame

Files uploaded as `.HEIC`/`.HEIF` (the iPhone default) don't display in Baze Office — staff see a broken document. The reported case is a worker document (Maria Piedad), and it is not the only one. It's intermittent because iOS sometimes converts to JPEG on web upload and sometimes doesn't.

The label calls it a "404", but the real mechanism is different: the viewer renders documents with a plain `<img>` pointing at the Storage public URL, Storage returns the bytes (HTTP 200), and desktop Chrome/Firefox simply cannot decode HEIC — so the image is broken, not missing.

Files enter storage from three pipelines, two of them external and not changed here: staff upload inside Baze Office, the worker onboarding webapp, and a Make "Upload Foto" scenario. The external pipelines keep producing HEIC, so any fix that only touches one upload path leaves the problem live.

## Key Decisions

- **Convert at render, not at storage or ingest.** Render-time conversion is source-agnostic: it fixes HEIC already in storage and future HEIC from any pipeline, with zero backend infrastructure. A storage-event edge function that converts once at rest was considered and rejected on added infrastructure plus an unverified feasibility risk (decoding a 12MP HEIC inside a Supabase Edge Function's limits). Recorded as an ADR in the workspace.
- **Library: `heic-to`, not `heic2any`.** `heic2any` is unmaintained (v0.0.4, 2023) and crashes or returns black images on modern iPhone iOS 17/18 HEIC — exactly the files in scope. `heic-to` ships current libheif (1.22.2), has a first-class web-worker entry point, and inlines its WASM into the JS chunk, so there is no separate `.wasm` asset to misconfigure under the Vite base path. License is LGPL-3.0.
- **Main-thread decode first; web worker as a performance follow-up.** A single modal decode runs fine on the main thread behind a spinner. The worker matters only for the many-thumbnails-at-once case; shipping the fix does not block on it.
- **Only HEIC/HEIF is converted.** Every other non-renderable format falls to the graceful fallback, not a converter.
- **No backfill.** Render-time conversion rescues existing stored files on the fly; the stored objects are never rewritten.

## Requirements

**Conversion & rendering**

- R1. In the Baze Office viewer, images stored as HEIC/HEIF are decoded to a renderable format in the browser and displayed correctly, everywhere the office renders a stored image: document modal preview, attachment thumbnails/slots, and the worker profile foto.
- R2. The behavior is source-agnostic — it applies to HEIC already in storage and to future HEIC regardless of upload pipeline, with no change to stored files, paths, or database records.
- R3. Only HEIC/HEIF is converted; already-renderable formats (JPG, PNG, WebP, GIF) and PDFs render unchanged, with no decode attempt.
- R4. HEIC/HEIF references are recognized as images by the viewer's image detection so they attempt to render — today `.heic` is excluded and shows no preview at all.

**Error & fallback**

- R5. When a HEIC fails to decode, the viewer shows a graceful fallback — file name plus a download / open-in-new-tab link — never a broken `<img>`. The same fallback covers any other non-renderable file that reaches the viewer.

**Performance**

- R6. The decoder is loaded lazily — only when a HEIC actually needs rendering — adding nothing to the initial app load.
- R7. A decoded HEIC is cached for the session, so the same file is decoded at most once per session.
- R8. Decoding never blocks the UI: a loading state shows while a HEIC decodes, and a view containing several HEIC files stays responsive.

## Acceptance Examples

- AE1. **Covers R1, R2.** Given a worker document already in storage as `.heic` (the reported case), when staff open it in the Baze Office viewer, then the image displays correctly and the stored file and DB row are untouched.
- AE2. **Covers R1, R4.** Given a new `.heic` document, when it appears as a thumbnail and is opened in the modal, then both render the image.
- AE3. **Covers R5.** Given a `.heic` that cannot be decoded, when staff open it, then a fallback with the file name and a download/open link appears instead of a broken image.
- AE4. **Covers R3.** Given a `.jpg`, `.png`, or `.pdf`, when it is shown, then it renders exactly as before and no HEIC decode is attempted.
- AE5. **Covers R6, R8.** Given a worker with several HEIC documents, when the documents view opens, then the page stays responsive and the decoder chunk loads only because a HEIC is present.

## Scope Boundaries

- The Make "Upload Foto" scenario and the worker onboarding webapp (Webflow) keep producing HEIC; converting at those sources is a separate effort. The render fix covers their output as shown *inside Baze Office*, but family-facing surfaces (e.g. the matching webapp) are not touched here.
- Storage-side / ingest conversion, and any backfill of files already in storage.
- Conversion of non-HEIC "non-standard" formats (TIFF, RAW, …) — these get the fallback, not a converter.
- Making the downloaded original a true `.jpg`; an optional cosmetic client-side download rename is deferred to planning.

## Dependencies / Assumptions

- `heic-to` (LGPL-3.0) is acceptable as an unmodified, dynamically-imported dependency in the hosted front-end; the license obligation would matter only if it were statically relinked or redistributed.
- libheif — and therefore `heic-to` — flattens HDR gain maps to SDR and decodes only the primary image of a multi-image HEIC. Assumed acceptable for document/ID photos (no HDR-fidelity or auxiliary-image need).
- Deploy target is GitHub Pages, which cannot emit custom response headers, so no COOP/COEP and thus no SharedArrayBuffer threading — use a single-threaded build. `heic-to`'s inlined WASM avoids a separate `.wasm` asset, sidestepping base-path (`/bazeoffice/`, `/staging-bazeoffice/`) resolution 404s.

## Outstanding Questions

Deferred to planning:

- The exact seam to centralize conversion — a shared image component/hook wrapping the `isImageUrl` check and `<img>` — so all surfaces benefit from one place rather than being patched individually.
- The web-worker trigger (when to go off-main-thread vs decode inline) and the cache shape (object-URL lifecycle and eviction).
- Whether to include the optional download-filename rename (`.heic` → `.jpg`) in this task.
- Confirm the PDF preview path is separate from `<img>` so it stays untouched (quick check during planning).

## Sources / Research

- Feasibility spike (multi-agent workflow, adversarially verified). Library comparison and build/worker feasibility. `heic-to` v1.5.2: gzip ~735 KB, libheif 1.22.2, worker entry `heic-to/next`, WASM base64-inlined, ~341k weekly downloads, last release 2026-05-26. `heic2any` excluded for documented iOS-18 decode failures (issues #61 / #63 / #50) and an LGPL relabeling issue.
- Hook surfaces (repo-relative): `src/modules/lavoratori/components/documents-card.tsx:828` (modal `<img>`); `src/components/shared-next/attachment-upload-slot.tsx:20` (`isImageUrl`), with use at `:63` and `:120`; `src/lib/attachments.ts:113` (`attachmentPathToPublicUrl`); `src/components/shared-next/attachment-utils.ts:48`; `src/modules/lavoratori/lib/base-utils.ts:258` (worker foto).
- Build: Vite 7 (installed 7.3.1); `React.lazy` / dynamic `import()` established (`src/pages/app-pages.tsx`, `src/App.tsx:10`); no CSP; single-threaded WASM required on GitHub Pages.
- Decision record: workspace ADR "HEIC conversione a render (render-time, non a livello storage)" and Linear BAZ-21.
- The workflow's viewer-grounding agent failed mid-run; the hook surfaces above were re-verified by hand — planning should re-ground precise line numbers before editing.
