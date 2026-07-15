---
title: "Opt-in behavior on a shared primitive: wrap it, don't flag it (EnlargeableAvatar)"
date: 2026-07-10
category: design-patterns
module: "worker detail avatar (src/components/shared-next/enlargeable-avatar.tsx; scheda lavoratori)"
problem_type: design_pattern
component: frontend
severity: medium
applies_when:
  - "Adding a behavior (click, hover, selection) to only SOME of the surfaces that render a shared UI primitive"
  - "Tempted to add a boolean prop/flag to a shared component (Avatar, Image, Card) to toggle a new behavior"
  - "Relocating a component that carries its own fallback/empty state into a surface with a different background"
tags: [shared-primitive, opt-in, wrapper, avatar, lightbox, dialog, radix, fallback-contrast, heic, lavoratori, design-pattern]
---

# Opt-in behavior on a shared primitive: wrap it, don't flag it

## Context

BAZ-38 needed the worker photo on the **scheda lavoratore** (detail view) to open full-screen on click, so staff can verify identity. The photo is rendered everywhere by `HeicAwareAvatar` (the HEIC-aware wrapper over the Radix `Avatar` primitive, from BAZ-21): list cards (`lavoratore-card.tsx`), the ricerca pipeline and map, and the two detail views (`worker-profile-overview.tsx`, `worker-profile-header.tsx`).

The click-to-enlarge behavior was wanted on **only the two detail avatars** — not on the list/pipeline/map avatars. Two obvious-but-wrong shapes: (a) add an `onClick`/`enlargeable` prop to `HeicAwareAvatar` itself, or (b) build a bespoke `<img>` viewer. Both leak or duplicate.

## Guidance

**1. To give a behavior to only *some* renders of a shared primitive, add a thin wrapper used at those call sites — do not add a prop/flag to the primitive.**

`EnlargeableAvatar` (`src/components/shared-next/enlargeable-avatar.tsx`) is a **drop-in** for `HeicAwareAvatar` (`EnlargeableAvatarProps = HeicAwareAvatarProps`). Adoption is a 1:1 tag swap at exactly the two detail call sites; every other call site keeps using the plain `HeicAwareAvatar` and is provably unaffected. The shared primitive stays pure — no new prop, no new branch, no way for the behavior to leak to a surface that didn't opt in.

**2. Reuse the primitive's siblings for the hard parts.** The lightbox reuses the existing Radix `Dialog` (`src/components/ui/dialog.tsx`) — controlled `open`/`onOpenChange`, giving ESC + backdrop-click + focus-trap for free — and puts `AttachmentImage` inside it, so HEIC conversion and the "Scarica / apri" error fallback come for free. No new library. Two Radix gotchas here: `DialogContent` ships **no** built-in close button (add an explicit `DialogClose` X), and Radix requires a `DialogTitle` — use a visually-hidden one (`className="sr-only"`) plus `aria-describedby={undefined}` to silence the description warning.

**3. When you relocate a component that carries its own fallback/empty state, re-check that state's *visual* assumptions in the new surface.** `AttachmentImage`'s "Scarica / apri" fallback was designed for a **light** surface (`bg-muted/20` card, `bg-background` slot). Dropped into the transparent lightbox over the dark overlay, its `text-muted-foreground` icon+filename became illegible — on the exact HEIC-conversion-failure path the fallback exists to serve. Fix: give the lightbox content an opaque light backing (`bg-surface`) that is invisible behind an opaque photo (no letterbox with `object-contain` when only `max-*` constraints are set) but restores the fallback's intended contrast.

## Why This Matters

The wrapper-vs-flag choice is the **inverse** of the BAZ-21 lesson (`../integration-issues/heic-render-time-conversion-in-viewer.md`). There the failure was **under-covering** render paths (the shared `ui/avatar` primitive was missed when fixing "HEIC everywhere"). Here the failure mode is the opposite: **over-covering** them — a flag on the shared primitive would have silently switched on click-to-enlarge for list/pipeline/map avatars too. Same axis (how a behavior spreads across the render paths of a shared primitive), opposite direction. A wrapper makes the blast radius exactly the set of call sites you edited — greppable, reviewable, and impossible to leak.

Point 3 matters because a reused component's fallback is easy to forget: the happy path (a normal photo) looks perfect, and only the rare degraded path is broken — precisely the path that is hardest to notice and most important when it fires. This regression was **not** caught by the happy-path unit tests; it was caught by an adversarial multi-agent review reasoning about contrast on a variable/dark backdrop.

## When to Apply

- You want a behavior on a **subset** of the surfaces that render a shared primitive → wrap at those call sites; keep the primitive pure. Reserve a prop on the primitive for behavior that genuinely belongs to *every* render.
- You are moving a component with a built-in fallback/loading/empty state into a surface with a **different background** (dark overlay, colored panel, transparent container) → verify the fallback's contrast there, not just the success state.
- Building a modal/lightbox on Radix `Dialog`: add an explicit `DialogClose`, a visually-hidden `DialogTitle`, and `aria-describedby={undefined}`.

## Examples

Adoption is a pure tag swap (both `worker-profile-overview.tsx:192` and `worker-profile-header.tsx:475`); the status-badge `<span>` stays a sibling, untouched:

```tsx
// before
<HeicAwareAvatar size="xl" src={worker.immagineUrl} type={worker.immagineType}
  alt={worker.nomeCompleto} fallback={initialsFromName(worker.nomeCompleto)} className={ring} />
// after — same props + the real-photo signal
<EnlargeableAvatar size="xl" hasPhoto={worker.hasRealPhoto}
  src={worker.immagineUrl} type={worker.immagineType}
  alt={worker.nomeCompleto} fallback={initialsFromName(worker.nomeCompleto)} className={ring} />
```

**Enlargeable only for a *real* photo — and URL presence can't tell you that.** `worker.immagineUrl` is **never empty**: `toListItem` falls back to a generated default-avatar asset (`avatarImage?.url ?? getDefaultWorkerAvatar(workerId)`), which renders as a real `<img>`, not initials. So a `src.trim() !== ""` check can't distinguish a real photo from the placeholder — a photo-less worker would enlarge a generic avatar (in every environment). The distinction is only knowable at the data seam, so thread an explicit boolean:

```tsx
// caller (base-utils.ts toListItem): the only place that knows real vs placeholder
hasRealPhoto: avatarImage != null,
// wrapper: opt-in click only for a real, non-empty photo
const canEnlarge = hasPhoto && typeof src === "string" && src.trim() !== ""
if (!canEnlarge) return <HeicAwareAvatar src={src} type={type} alt={alt} {...rest} />
// ...else open a controlled <Dialog>; content is:
<AttachmentImage src={src} type={type} alt={alt ?? ""} loading="eager"
  className="max-h-[90vh] max-w-full rounded-lg bg-surface object-contain" /> // bg-surface = legible fallback
```

> Do **not** also gate on "is the image currently rendering" (e.g. running `useRenderableImageSrc` in the wrapper and requiring `status === "ready"`). It duplicates the decode `HeicAwareAvatar` already runs, makes HEIC photos un-clickable until decoded, and doesn't prevent a broken *non-HEIC* URL (which resolves to `ready` synchronously) — a broken/undecodable real photo is already handled *inside* the lightbox by `AttachmentImage`'s "Scarica / apri" fallback. Let the reused component degrade; don't pre-gate the click.

Tests (`enlargeable-avatar.test.tsx`, vitest/happy-dom) lock the behavior that would otherwise silently regress: no button unless there's a **real** photo (inert for the default-avatar placeholder, `null`, and whitespace-only `src`), opens with the right `src`/`alt`, closes on Escape and via X, and the HEIC path both enlarges the converted image and degrades to the download fallback (not a broken image) on decode failure.

Related: `../integration-issues/heic-render-time-conversion-in-viewer.md` (the shared avatar/HEIC seam, and the inverse render-path lesson), `../ui-bugs/leaflet-portaled-ui-zindex-and-popup-positioning.md` (portaled-overlay stacking, relevant if this is ever reused in a view with a map).
