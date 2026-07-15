---
title: "Adding a display field to a board card: whether you must register it in the realtime BINDINGS depends on the hook's feed shape"
date: 2026-07-15
category: best-practices
module: "CRM board/data hooks (use-crm-assegnazione, use-crm-pipeline-preview)"
problem_type: best_practice
component: realtime_board
severity: medium
applies_when:
  - "Adding a new read-only display field to an existing board/detail card"
  - "The source column already arrives in the payload (no backend change needed)"
  - "Deciding whether the new field also needs a realtime field-BINDING entry"
symptoms:
  - "A newly-added detail field flickers to '-'/blank on a remote realtime update, then comes back"
  - "Two near-identical 'add a field to a card' tasks need different amounts of wiring"
tags: [realtime, board-hook, preserveMissingFields, field-bindings, setof-rpc, pattern-a, stale-panel, processi-matching]
---

# Adding a display field to a board card: the realtime-BINDING decision is per-hook

When you add a read-only display field to a board card, the mapping change
(`type` + one line in the card builder + the render) is the easy part. The
non-obvious question is: **do you also have to register the new field in the
hook's realtime field-BINDINGS (`preserveMissingFields` / Pattern A)?** The
answer is **per-hook**, driven by the hook's feed shape — and getting it wrong
gives a field that goes stale/blank on realtime updates without any test or
`tsc` catching it.

This is the realtime companion to the *feed-tracing* and *untyped-key* lessons —
[[scheda-lavoratore-ricerche-coinvolte-cards-rpc-feeds]] (where the field lives /
`RETURNS SETOF` vs explicit projection) and the phantom-key gotcha there. Those
answer *"can the field appear at all, and does it need a backend change?"*. This
doc answers the next question: *"once it's mapped, will it survive a realtime
refresh?"*. See `docs/realtime-board-pattern.md` (Pattern A) and CLAUDE.md
"The Realtime Bug Class" for the underlying mechanism.

## Context

The realtime bug class (CLAUDE.md) bites a card field only when **all three**
hold: (1) the board query fetches a **restricted/preview** column set, (2) a
**separate detail loader** fetches more columns, and (3) board + detail **share
state** (same queryKey + `setQueryData`). Hooks that merge board and detail
through the cache defend every such field with a `BINDINGS` map consumed by
`preserveMissingFields(card, previous, row, bindings)`: on a fresh payload that
**omits** a column, the field is restored from the previous card instead of
being wiped to null.

The trap: **adding a mapped field to a merge-preserving hook without also adding
it to that hook's BINDINGS** leaves the field unprotected. It renders fine on
first load, then blanks on the next remote CDC event — a stale-panel bug that no
unit test or `tsc` surfaces, because the mapping itself is correct.

## Guidance

Before adding the field, classify the hook you're editing:

- **Whole-row feed, no separate detail loader → NO binding needed.** If the
  board query is fed by an RPC that `RETURNS SETOF <table>` (the whole row) and
  the detail panel renders from the same board card object (no second loader,
  realtime reload is a full `invalidateQueries` refetch), then every column is
  always present on every refetch. There is nothing to "preserve" — just map the
  field. Adding it to a BINDINGS map would be dead code (the hook has none).

- **Board+detail merged through the cache → you MUST register the field.** If
  the hook keeps a `*_FIELD_BINDINGS` map and calls `preserveMissingFields`, add
  a `{ dbColumn -> cardField }` entry for the new field in the same change.
  Skipping it ships the stale-panel bug.

Verify by grepping the hook for `preserveMissingFields` / `BINDINGS`. Its
**presence or absence is the whole answer** — don't reason from the field name.

## Why This Matters

The two failure directions are asymmetric and both silent:

- Forget a binding on a merge-preserving hook → **stale-panel bug in prod**
  (field blanks on realtime), invisible to CI.
- Add a binding to a whole-row hook → harmless but confusing dead code.

Neither `tsc` nor a mapping unit test catches the first — the mapping is right;
the regression only appears under a live realtime event with a partial payload.

## When to Apply

Any time you add (or move) a field consumed by a board/detail card in this repo.
Runs before you write the mapping, not after.

## Examples

Two hooks that read the **same** `processi_matching` data, opposite answers:

| Hook | Feed | Detail source | BINDINGS? | Adding a field |
| --- | --- | --- | --- | --- |
| `use-crm-assegnazione` | `processi_matching_by_stato_res` — `RETURNS SETOF processi_matching` (whole row) | The board card itself; realtime = full `invalidateBoard` refetch | **None** | Map only. (BAZ-32: `disponibilitaColloquiInPresenza` — one line in `fetchAssegnazioneCards`, no binding.) |
| `use-crm-pipeline-preview` | preview board + separate detail merge via `setQueryData` | Separate loader sharing the cache | **`PROCESS_FIELD_BINDINGS` + `preserveMissingFields`** | Map **and** add the `{ column -> field }` entry, or the field goes stale on realtime. |

Concretely, `use-crm-pipeline-preview` already registers this exact column
(`disponibilita_colloqui_in_presenza -> disponibilitaColloquiInPresenza`) in
`PROCESS_FIELD_BINDINGS` because it merges board+detail; `use-crm-assegnazione`
does not, and correctly should not, because its whole-row RPC re-derives the
field on every refetch. Same column, same card field name, different wiring —
decided entirely by the feed shape.
