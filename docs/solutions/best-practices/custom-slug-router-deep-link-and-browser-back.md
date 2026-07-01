---
title: "Custom slug router: deep-linking a board/detail and restoring nested state on browser Back"
date: 2026-07-01
category: best-practices
module: "routing (src/routes/app-routes.ts + src/components/layout/app-shell.tsx)"
problem_type: best_practice
component: routing
severity: medium
applies_when:
  - "Adding a deep-link into a board/detail in the custom slug router (no router library)"
  - "Making the browser Back button restore a nested UI state (open detail / focused row)"
  - "Auto-selecting a board card on mount from a URL-provided id"
  - "A board has lazy/deferred columns and you deep-link into one"
symptoms:
  - "A link opens the section default (e.g. anagrafiche/famiglie) instead of the specific record"
  - "Browser Back collapses to the board/pipeline instead of the previous detail card"
  - "An effect that restores selection from the URL re-fires on every realtime board refresh"
tags: [routing, deep-link, history, pushstate, replacestate, popstate, custom-router, board, deferred-columns]
source: "BAZ-19 + BAZ-20 — bazeoffice"
---

# Custom slug router: deep-linking a board/detail and restoring nested state on browser Back

## Context

bazeoffice has **no router library**. Routing is a custom slug system: a single
`useState<AppRoute>` in `AppShell` synced to the URL via `history.pushState/replaceState`,
with `resolveRouteStateFromPath(pathname)` (URL → state) and `buildPathForRoute(route)`
(state → URL) in `src/routes/app-routes.ts`. Master/detail is **not** a route
segment by default — it is an id-branch inside `src/pages/app-pages.tsx`
(`route.ricercaProcessId ? <Detail/> : <Board/>`).

Two Cycle-1 bugs exercised the same subsystem:

- **BAZ-20** — a "Datore" card linked to `anagrafiche/famiglie` instead of opening
  the assunzione. Needed a **deep-link into a board with a specific card selected**.
- **BAZ-19** — deep navigation (ricerca → lavoratore → related ricerca) then browser
  **Back** collapsed to the pipeline instead of the previous ricerca+worker. Needed
  the browser Back button to **restore nested UI state**.

## Guidance

### 1. Adding a deep-link is a 4-hop change (mirror the existing `initialSelectedRapportoId`)

1. **`AppRoute`** (`app-routes.ts`) — add an optional field, e.g. `selectedAssunzioneRapportoId?: string | null`. Add it to `DEFAULT_ROUTE` too.
2. **`resolveRouteStateFromPath`** — parse the id out of the slug segment (`parts[2]`), mirroring the rapporti branch. For a section that already has other exact-match `slug === "..."` branches, switch to a `section === "..." && parts[1] === "..."` match so the id segment doesn't fall through.
3. **`buildPathForRoute`** — emit `.../{encodeURIComponent(id)}` when the field is set, else the bare slug.
4. **page → board view** — `app-pages.tsx` passes `initial<Thing>Id={route.<field> ?? null}`; the page forwards it; the board view auto-selects on mount.

### 2. Auto-select **once per id** via a ref — never key the effect on `columns` identity

The board's `columns` array gets a fresh identity on every realtime refresh /
optimistic update. An auto-select effect that re-selects whenever `columns`
changes re-opens the documented **fetch → updateCard → columns-identity-change →
fetch** loop (observed ~70s of main-thread freeze). Guard on the **id** with a
`useRef`, and keep the decision in a pure, testable helper:

```ts
// effect: fire once per initialSelectedRapportoId
if (autoSelectDoneRef.current === targetId) return
if (loading) return
const action = resolveDeepLinkSelection(columns, targetId) // pure
// ... dispatch: select | load-deferred | wait | load-error | not-found
```

### 3. Deferred/lazy columns: the resolver must treat a **failed** load as terminal

If a board has lazy columns (assunzioni defers `"Contratto firmato"` /
`"Non assume con Baze"`), the deep-link target may live in a not-yet-loaded
column, so the resolver returns `load-deferred` and kicks the load. But a column
that **errored** settles as `{ loaded:false, loading:false, loadError:msg }` —
if the resolver only filters `deferred && !loaded && !loading`, the errored
column re-qualifies as "unloaded" forever, and a `kicked` guard then blocks both
re-kick *and* the terminal toast → the auto-select **stalls silently**. Exclude
`loadError` columns from the loadable set and return a distinct terminal action.

### 4. Browser Back needs the state **in the URL** — an in-app return ref is not enough

`popstate` handler = `resolveRouteStateFromPath(location.pathname)`. So the only
way the browser Back button can restore a nested UI state is if that state is
encoded in the URL. In BAZ-19 the focused worker (a *selezione* id) is encoded as
a 3rd slug segment `ricerca/{processId}/{selectionId}`. The pre-existing
`ricercaDetailReturnRouteRef` only feeds the **in-app Back chevron**
(`handleBackFromRicercaDetail`), not the browser Back — do not confuse the two,
and do not repurpose the ref for browser history.

### 5. push vs replace: explicit push in the handler; global effect stays `replace`

`AppShell` has a global `useEffect(() => syncBrowserUrl(route, "replace"), [route])`
that must stay `"replace"` so top-level/sidebar navigation doesn't spam history.
A handler that creates a **new logical location** (open a related ricerca) must
call `syncBrowserUrl(next, "push")` **explicitly**. The subsequent global replace
then no-ops because `syncBrowserUrl` early-returns when `currentPath === targetPath`.
A handler that only **annotates** the current location (focus a worker) just calls
`setRoute` and lets the global effect `replace`.

## Why This Matters

- Skipping the ref guard (point 2) reintroduces a real, measured 70s freeze.
- Flipping the global effect to `push` (point 5) spams the history stack on every
  board/sidebar switch — the opposite failure of the bug being fixed.
- Encoding nested state in the URL (point 4) is what makes deep-links
  bookmarkable/refreshable *and* what makes the browser Back button correct — the
  same mechanism serves both.

## When to Apply

Any new deep-link or "restore this on Back" feature in the custom router. Reach
for the `initialSelectedRapportoId` implementation (rapporti) as the reference,
and the assunzioni/ricerca implementations from BAZ-19/BAZ-20 as the two shapes
(board-card select vs nested-state restore).

## Examples

**Naming gotcha (BAZ-20), caught in plan review:** the assunzioni board is
indexed by **`rapporti_lavorativi.id`** — `card.id === rapporto.id` and
`fetchAssunzioneDetail` takes `p_rapporto_id`. It is **not** an `assunzioni`-table
id. Passing `rapporto.id` from the Datore card matches a board card directly (no
lookup), but the route field is named `selectedAssunzioneRapportoId` so the name
doesn't lie about what the value is.

**Regression from moving transient state into the URL (BAZ-19), caught in review:**
once the focused worker lives in the URL, the effect that restores it from
`focusSelectionId` stays "armed" for the whole overlay lifetime (previously it was
null for manual opens). Keyed on the realtime `columns` array, it then re-fires on
every board refresh → redundant profile re-fetch + "Caricamento profilo..." toast
flash + a reopen-on-close race. Fix: open **once per selection** with a ref
(`openedFocusRef`), so realtime refreshes don't re-sync an already-open overlay.
General rule: **when you promote formerly-transient local state to route/URL state,
audit every effect that reads it — an effect that was harmless because the value
was usually null may now fire continuously.**
```
