---
title: "Autosave: validate before saving and surface failures non-destructively (skippedKeys + inline error)"
date: 2026-08-12
problem_type: ui_bug
category: ui-bugs
component: ricerca-detail-view
module: ricerca
severity: high
tags:
  - autosave
  - useAutoSaveForm
  - skippedKeys
  - validation
  - react-hook-form
  - optimistic-update
  - error-handling
  - fase-5-bis
symptoms:
  - "editing famiglia telefono/email in the ricerca detail sidebar wiped the in-progress text"
  - "a mid-typing invalid value flipped the whole detail view to an Errore caricamento… banner"
root_cause: "an invalid intermediate was autosaved, rejected 400, and the destructive optimistic-rollback + swallowed error zeroed the RHF dirty flag so keepDirtyValues stopped protecting the field"
resolution_type: code_fix
related:
  - docs/solutions/ui-bugs/debounced-input-focus-guard-realtime-cursor-jump.md
linear: BAZ-192
---

# Autosave: validate before saving and surface failures non-destructively

## Problem

In the ricerca detail sidebar, the famiglia **telefono** and **email** fields autosave on every ~300ms typing pause (FASE 5 BIS `useAutoSaveForm`). While correcting a value, a **partial/invalid intermediate** (e.g. `+3938`) was sent to the backend, which rejected it with `400 "Invalid famiglia telefono"`. The whole detail view then flipped to a shared error banner and the field was reverted to its original value — **the edit was lost**. Deterministic; it hit a daily recruiter action.

Sister bug to [BAZ-187](debounced-input-focus-guard-realtime-cursor-jump.md) (same symptom "in-progress edit lost", **different cause** — that one was a realtime resync + two-layer draft; this one is validation + a destructive save-error seam).

## Symptoms

- Typing/deleting digits in telefono (or email) and pausing → the text jumped back to the last saved value.
- A red `Errore caricamento dettaglio ricerca: Invalid famiglia telefono` banner appeared over the (still-rendered) card — a **save** error mislabeled as a **load** error.

## What Didn't Work / False leads

- **"Add `keepDirtyValues`"** — already present. The field *is* protected by `keepDirtyValues`, but the bug zeroes the dirty flag before the resync, so the protection no longer applies (see below).
- **Blaming the realtime resync** (the BAZ-187 mechanism) — not involved here. The clobber is driven entirely by the save path.

## Root cause — a compound of three destructive acts

The edit-loss was a compound in the caller (`src/modules/ricerca/hooks/use-ricerca-detail-view.ts`), not the shared engine:

1. **The invalid intermediate was sent at all.** `onSave` trimmed the value and forwarded it; there was no client-side validation, so partial input reached the backend and 400'd.
2. **The error was swallowed.** `saveFamilyPatch` had an empty `catch`, so from the autosave engine's view `onSave` **resolved successfully**. The engine then advanced its committed baseline to the *invalid* value and ran `form.reset(..., { keepValues: true })`, which **clears the RHF dirty flag**. The field was now "clean".
3. **The optimistic card was rolled back.** `updateFamilyCard`'s `catch` did `setCard(previousCard)` + `setError(...)`. Reverting the card changed the rebuilt `defaults`, whose JSON signature change fires `useAutoSaveForm`'s resync `form.reset(defaults, { keepDirtyValues: true })` — but the field was just marked **clean** (step 2), so `keepDirtyValues` no longer protected it → it was reset to the original value. And `setError(...)` wrote the `error` state that is **shared with the initial-load failure path**, rendering the load-error banner (hard-coded copy `Errore caricamento dettaglio ricerca:`).

Key insight: **if the error is not swallowed, the engine's reject path only toasts — it does NOT roll back the value or clear the dirty flag** (`src/hooks/use-auto-save-form-fields.ts`), so the field stays dirty and `keepDirtyValues` keeps protecting it even though the card rollback still fires. Not-swallowing is half the fix.

## Solution

All changes are **caller-local** in the ricerca hook + a ricerca-module component; the shared autosave engine (~24 call sites) is untouched.

1. **Validate before saving — exact backend mirror.** `src/modules/ricerca/lib/ricerca-family-contact.ts` `resolveFamilyContactFieldError(key, raw)` mirrors the backend `update-record` gate character-for-character (telefono: `normalizeFamilyPhoneValue` then `/^\+[1-9]\d{7,14}$/`; email: `trim().toLowerCase()` then `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; empty is invalid, as the backend rejects empty). The regex/normalize live in one shared source, `src/lib/family-contact-validation.ts` (promoted from `crm/lib`; the CRM header form imports the same file).

2. **Never send the invalid intermediate; keep it as a dirty draft via `skippedKeys`.** In `onSave`, an invalid family key is added to the engine's `skippedKeys` and **not** put in the outgoing patch. The engine keeps a skipped key **dirty and uncommitted**; when a flush contains *only* skipped keys it **early-returns without any `form.reset`** (`use-auto-save-form-fields.ts`), so the draft survives untouched and survives a later defaults resync.

3. **Non-destructive inline error — caller-local state, cleared live.**
   - `const [familyFieldErrors, setFamilyFieldErrors] = useState<Partial<Record<"telefono"|"email", string>>>({})` — **not** `formState.errors`, because every `form.reset` the engine runs would wipe an RHF `setError`.
   - Rendered by an opt-in `error?` prop on `RicercaDetailEditableTextField` (`<Field invalid>` + `<FieldError>`), so no shared component is touched.
   - A `form.watch` subscription **clears** the per-field error the instant the value becomes client-valid. This covers the revert-to-committed case: reverting to *exactly* the last saved value does **not** trigger an autosave flush (the engine's `valuesEqual` short-circuit), so `onSave` never runs — without the live clear, a now-valid field would keep a stale red error.

4. **Generalize the non-destructive seam across the 3 sidebar writers.** `updateFamilyCard` / `updateAddressCard` / `updateProcessCard` no longer write the shared `error` banner state on a save failure; they revert the optimistic card and rethrow. Family surfaces inline; address/process surface a `toast.error` (with a stable `id` so repeated failures coalesce). The `error` banner is now written **only** by the initial-load path.

### Before / after (the family save path)

```ts
// BEFORE — swallow + banner + destructive rollback
const saveFamilyPatch = async (_s, patch) => {
  try { await updateFamilyCard(familyId, patch) } catch { /* swallowed */ }
}
// updateFamilyCard catch: setCard(previousCard); setError(caught.message); throw

// AFTER — validate, skip invalid, keep dirty, inline error; card revert but no banner
onSave: async (patch) => {
  // ...classify keys...
  for (const key of familyKeys) {
    const err = resolveFamilyContactFieldError(key, raw)
    if (err) { skippedKeys.push(key); nextFamilyErrors[key] = err; continue }  // not sent
    familyPatch[key] = raw || null
  }
  if (familyKeys.length) setFamilyFieldErrors(merge)
  if (Object.keys(familyPatch).length) {
    try { await updateFamilyCard(familyId, familyPatch) }
    catch { for (k of familyPatch) { skippedKeys.push(k); nextFamilyErrors[k] = "Impossibile salvare, riprova" } }
  }
  // ...address/process via updateXCard, catch → skippedKeys (toast fired inside)...
  return skippedKeys.length ? { skippedKeys } : undefined
}
// updateFamilyCard catch: setCard(previousCard); throw   (no setError, no toast)
```

## Why This Works

- Prevention (client validate) removes the common case entirely — no 400, no error flash while typing.
- `skippedKeys` is the sanctioned engine lever for "validated-but-not-persisted, keep the draft"; the only-skipped early-return means the invalid draft is never reset.
- Not swallowing + not writing the shared `error` state means a genuine failure surfaces where the user is (inline / toast), and the load-error banner keeps its meaning.
- Caller-local error state + live `form.watch` clear is immune to the engine's `form.reset` cycles and to the no-flush revert-to-committed path.

## Prevention

- **Validate before a fail-closed sink; keep the client check an exact mirror of the server** (normalize *then* regex — a bare regex over raw input over-rejects valid Italian numbers). Duplication across the JS client and the Deno backend is unavoidable; centralize the client side in one file (`src/lib/family-contact-validation.ts`).
- **Autosave error handling must be non-destructive:** never let a rejected save clear the user's in-progress text, never roll the whole view to an error surface for one field, and never share the save-error surface with the load-error surface.
- **When an autosave field must hold an un-persistable value, return `{ skippedKeys }`** — do not swallow the error (that marks it committed and clears dirty).
- **Derive/clear inline validation state from the live field value, not only from the save callback** — the engine skips the flush when the value returns to its committed baseline.
- **Tests (characterization-first, real DebouncedInput):** drive with `fireEvent.change` + real timers (never `form.setValue`, which skips the DebouncedInput layer and gives false greens). Cover: invalid-not-sent + inline error + no banner; corrected-clears-error; **revert-to-committed clears error (no flush)**; 400-slip keeps text; **draft survives a defaults resync** (blur first so the BAZ-187 focus guard doesn't mask `skippedKeys`); record-switch resets the error; initial-load failure still shows the banner. Mutation-verify the `skippedKeys` return and the live-clear. See `src/modules/ricerca/components/__tests__/ricerca-detail-view-family-autosave.integration.test.tsx`.

## Out of scope (pre-existing, surfaced in review)

- `saveOrariSection` shows a success toast + closes the section even when the underlying process patch failed (the swallow predates this fix) — tracked separately.
- A valid family edit is silently not persisted when `card.famigliaId` is missing (matches pre-change behavior; famigliaId is effectively always present on a processo).
