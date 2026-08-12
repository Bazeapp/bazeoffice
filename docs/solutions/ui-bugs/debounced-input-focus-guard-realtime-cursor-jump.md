---
title: "Two-layer draft: a realtime resync jumps the cursor in a focused DebouncedInput/Textarea despite keepDirtyValues"
date: 2026-08-11
last_updated: 2026-08-11
category: ui-bugs
module: "useDebouncedSave / DebouncedInput (src/hooks/use-debounced-save.ts, src/components/ui/debounced-input.tsx)"
problem_type: ui_bug
component: autosave_realtime
symptoms:
  - "Typing in a scheda-colloquio textarea (intervista_* / feedback Baze), a realtime refresh moves the caret to the end and can overwrite characters"
  - "The panel already uses useAutoSaveForm with keepDirtyValues, yet the focused field is still clobbered"
  - "The clobber lands during the ~300ms debounce window, or just after a save clears the RHF dirty flag"
root_cause: two_layer_draft_desync_rhf_clean_during_component_debounce
resolution_type: focus_aware_resync_guard
severity: medium
related_components: [useDebouncedSave, DebouncedInput, DebouncedTextarea, useAutoSaveForm, react_hook_form, supabase_realtime]
tags: [realtime, autosave, react-hook-form, keepDirtyValues, debounce, cursor-jump, focus, two-layer-draft, useDebouncedSave, resync-without-clobber, ui-bug, mutation-testing]
---

# Two-layer draft: a realtime resync jumps the cursor despite keepDirtyValues (BAZ-187)

## Problem

In the ricerca **scheda colloquio** panel, typing in one of the 7 free-text textareas
(6× `intervista_*` + the `messaggio_famiglia_selezione_lavoratore` "feedback Baze")
would jump the caret to the end — and could drop characters — whenever a Supabase
realtime refresh arrived. The panel was **already** on FASE 5 BIS (`useAutoSaveForm` +
`keepDirtyValues`), so the "obvious" fix was already in place and the bug persisted.

## Symptoms

- Caret jumps to end of a textarea while typing; occasional lost/duplicated characters.
- Only the fields on the `DebouncedInput`/`DebouncedTextarea` path are affected. Selects,
  native `date`/`time`/`datetime-local`, and multi-lookups (which write to RHF via an
  immediate `field.onChange`) are not.
- Reproducible whenever a realtime echo (a peer edit, your own save echo, an availability
  recompute) changes the row while your caret is in the field.

## What Didn't Work

**Adding `keepDirtyValues` — it was already there and does not cover this case.**
`useAutoSaveForm` resyncs with `form.reset(defaults, { keepDirtyValues: true })`, which
protects fields RHF considers **dirty**. The trap is a **two-layer draft**:

```
<FieldTextarea> → <DebouncedTextarea committedValue={field.value} onSave={field.onChange}>
                → useDebouncedSave  (local `draft` state, 300ms debounce)
```

For ~300ms after each keystroke the typed text lives **only** in the `useDebouncedSave`
`draft`; RHF's `field.value` still holds the old value, so **RHF sees the field as clean**.
(It is also clean in the moment just after a save, when `useAutoSaveFormFields` does
`form.reset(..., { keepValues: true })` to clear the dirty flag.) During that clean-but-
focused window, `keepDirtyValues` offers no protection: `form.reset` writes the server
value into `field.value`, that flows down as a new `committedValue`, and
`useDebouncedSave`'s sync effect called `setDraft(committedValue)` — swapping the value
under the caret.

So the fix cannot live at the RHF layer. **Cursor preservation has to be guarded at the
layer that owns the DOM element** — i.e. keyed on focus.

## Solution

Add a focus guard to `useDebouncedSave` and reuse the hook's existing "queue a resync,
apply it later" machinery (`queuedCommittedRef` / `applyQueuedCommitted`, originally built
for the mid-save window). While the field is focused, **queue** the incoming
`committedValue` instead of applying it; **flush on blur**.

`src/hooks/use-debounced-save.ts`:

```ts
const isFocusedRef = React.useRef(false)

// committedValue sync effect — queue while focused (as it already did mid-save)
if (savesInFlightRef.current > 0 || isFocusedRef.current) {
  queuedCommittedRef.current = { value: committedValue }
  return
}

// applyQueuedCommitted — also gate on focus (this is the SECOND guard site)
const applyQueuedCommitted = React.useCallback(() => {
  if (isDirtyRef.current || savesInFlightRef.current > 0 || isFocusedRef.current) return
  // ...apply queued value
}, [])

// expose focus/blur; blur drains the queue
const onFocus = React.useCallback(() => { isFocusedRef.current = true }, [])
const onBlur = React.useCallback(() => {
  isFocusedRef.current = false
  applyQueuedCommitted()
}, [applyQueuedCommitted])

return { value: draft, onChange, onFocus, onBlur }
```

`src/components/ui/debounced-input.tsx` — wire the hook's `onFocus`/`onBlur` into the
element, **composing** with any caller-provided handler (e.g. RHF `field.onBlur`):

```tsx
export function DebouncedTextarea({ committedValue, onSave, debounceMs, identity, onFocus, onBlur, ...props }) {
  const { value, onChange, onFocus: onFocusDraft, onBlur: onBlurDraft } =
    useDebouncedSave(committedValue, onSave, { debounceMs, identity })
  return (
    <Textarea
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => { onFocusDraft(); onFocus?.(e) }}
      onBlur={(e) => { onBlurDraft(); onBlur?.(e) }}
    />
  )
}
```

The change is additive — it does not touch the existing dirty / mid-save / identity-switch
/ flush-on-unmount guards, which CLAUDE.md marks load-bearing. The only real importer of
`useDebouncedSave` is `debounced-input.tsx`, so the shared change reaches all ~133 fields
through those two wrappers.

## Why This Works

The caret only ever lives in a **focused** element. Guarding the `draft`-replacing writes
on `isFocusedRef` means `setDraft` never runs under the caret — regardless of *what*
upstream changed `committedValue` (peer edit, own-save echo with `.trim()`, availability
recompute). Deferring to blur is also the semantically right behavior: while you are typing
in a field, a peer's update to that same field should not change it under you; it lands
when you leave the field.

## Prevention

- **A two-layer draft breaks single-layer clobber guards.** When a component keeps its own
  debounced `draft` on top of react-hook-form, `keepDirtyValues` (RHF layer) does not
  protect it during the debounce window — RHF sees the field clean. Guard cursor/value
  preservation at the layer that owns the DOM element (focus), not upstream.
- **Mutation-verify *every* guard site independently.** This fix has **two** focus guard
  sites — the `committedValue` sync effect and `applyQueuedCommitted`. The first was
  covered by the reproduction test; the second (a resync queued mid-save that settles while
  the field is still focused) was initially **untested** — removing it left the whole suite
  green. Delete each guard term in the source, confirm a test reds, restore. (See the
  sibling doc `characterization-testing-rhf-realtime-false-greens.md`.)
- **Characterize at the component level for cursor bugs.** Render the real
  `DebouncedTextarea` and drive it with `fireEvent.focus` / `fireEvent.change` /
  `fireEvent.blur` (never `form.setValue` — TRAP 1). Assert "the value under the caret was
  not replaced" as the proxy for "the cursor did not jump". Real timers + `waitFor`
  (TRAP 5). Tests: `src/hooks/use-debounced-save.integration.test.tsx`
  (`"focus-aware resync (BAZ-187)"`) and
  `src/modules/ricerca/components/__tests__/scheda-colloquio-panel-resync.integration.test.tsx`.
- **Known trade-off:** an *intentional* programmatic `setValue` on a focused field (e.g. the
  "Genera feedback" AI button) is also deferred to blur. In the normal flow the button
  click blurs the textarea first, so it still applies immediately; only a re-focus during
  the async generation would defer it. Accepted as an edge case rather than adding a
  force-apply path that could re-introduce the cursor jump.

## Related

- `docs/solutions/best-practices/characterization-testing-rhf-realtime-false-greens.md` —
  the false-green traps (TRAP 1 / TRAP 5, mutation-verify) applied here.
- `docs/solutions/best-practices/characterization-testing-selected-worker-editor.md` —
  the draft-resync-without-clobber pattern on the sibling editor hook.
- `docs/solutions/best-practices/board-card-display-field-realtime-binding-decision.md` —
  the realtime binding decision for the same bug class.
- `CLAUDE.md` — "Form Context Pattern (FASE 5 BIS)", "Realtime Pattern", and the
  `DebouncedInput`/`useDebouncedSave` load-bearing note.
- Linear BAZ-187.
