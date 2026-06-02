# Audit: writes bypassing trackWrite / pending-write tracking

Generated 2026-05-25 on branch `realtime-bug-class-plan`.

## Mechanism overview

`src/lib/anagrafiche-api.ts` (lines 485-530) exposes the write-tracking
primitives that `useRealtimeBoardSync` relies on to suppress self-induced
refetches:

- `trackWrite(promise)` (internal): wraps a write promise, increments
  `pendingWriteCount` for the duration of the request, and on success bumps
  `lastLocalWriteAt = Date.now()`.
- `beginPendingWrite()` / `endPendingWrite()` (exported): explicit boundary
  helpers used by debounced flows. `endPendingWrite()` also bumps
  `lastLocalWriteAt`.
- Read-side: `getPendingWriteCount()` and `getMillisSinceLastLocalWrite()`
  are consumed by `useRealtimeBoardSync` to (a) defer a board reload while a
  local write is pending, and (b) skip the reload when an echo arrives
  within `LOCAL_WRITE_ECHO_WINDOW_MS` (2500 ms) of the last local write.

If a save bypasses these helpers, the realtime echo is not recognised as
"ours" and triggers a full board refetch per save. On pages with a debounced
input that fires per keystroke this fans out into a cascade
(N keystrokes -> N RPC reloads).

The only call sites in the codebase that actually invoke trackWrite (directly
or via begin/end) are the three central writers in `anagrafiche-api.ts`
(`updateRecord`, `createRecord`, `deleteRecord`) and the
`useDebouncedSave` hook (begin/end bracket on every debounced edit).

## Central wrappers status

### `src/lib/anagrafiche-api.ts`

- `updateRecord` (line 1514): trackWrite present? Yes. Wraps
  `invokeEdgeFunction("update-record", ...)` in `trackWrite(...)`.
- `createRecord` (line 1530): trackWrite present? Yes.
- `deleteRecord` (line 1544): trackWrite present? Yes.
- `runAutomationWebhook` (line 1555): trackWrite present? **No**. Calls
  `invokeEdgeFunction("run-automation-webhook", ...)` directly, then
  `clearReadCaches()`. Whether this matters depends on whether the webhook
  ultimately writes rows the client subscribes to.
- `runSmartMatchingForwardPreview` (line 1569): trackWrite present? **No**.
- `updateProcessoMatchingStatoSales` (line 1580): delegates to
  `updateRecord`, so it inherits tracking. Covered.

### `src/hooks/use-board-mutations.ts`

- `useMoveMutation`: trackWrite present? **No** (the wrapper itself does
  not call trackWrite, it relies on `mutationFn` doing so).
- `usePatchMutation`: trackWrite present? **No** (same).
- `useCreateMutation`: trackWrite present? **No** (same).

This is **NOT a finding in itself**: every `mutationFn` passed to these
wrappers in the 10 board hooks calls `updateRecord` / `createRecord` /
`deleteRecord`, which are tracked. The wrappers transitively get coverage
through their callers. The risk is forward-looking: a future caller could
pass a `mutationFn` that calls a raw `invokeEdgeFunction` or
`supabase.rpc` and silently bypass tracking. See "Recommendations".

### `src/hooks/use-debounced-save.ts`

- Brackets every debounced save with `beginPendingWrite()` /
  `endPendingWrite()` (lines 75, 60, 88). The inner `onSave` typically also
  calls `updateRecord` which calls trackWrite — double-counting is fine
  because the count is only consulted for the unload-guard and `>0` checks,
  and `lastLocalWriteAt` is updated by both paths.

## Summary

- ~70 raw write call sites inspected across `src/lib`, `src/hooks` and
  `src/components`.
- **2 BYPASS sites** (writes whose realtime echo would NOT be suppressed
  by the echo-window).
- 1 secondary concern (`runAutomationWebhook` / `runSmartMatchingForwardPreview`
  in `anagrafiche-api.ts`) that may or may not be a real bypass depending
  on what the edge function persists.
- 0 central wrappers missing coverage **for the current callers**. The
  `use-board-mutations.ts` wrappers do not call trackWrite themselves; they
  are covered transitively because every existing `mutationFn` uses the
  tracked `updateRecord`/`createRecord`/`deleteRecord`.
- All other write call sites (10 board hooks + 9 detail/view components +
  `use-selected-worker-editor`, `use-rapporti-lavorativi-data`,
  `use-prove-colloqui-data`, `use-crm-pipeline-preview`, lavoratori views,
  payroll view, etc.) go through the tracked central writers and are
  **COVERED**.

The earlier note in `src/hooks/use-lavoratori-data.ts:1909` ("after
lavoratori saves go through trackWrite") is stale: every save path in
`use-selected-worker-editor.ts`, `lavoratori-cerca-view.tsx`,
`gate1-view.tsx` and `documents-card.tsx` already calls `updateRecord` /
`createRecord` / `deleteRecord`. The detail-effect reload cascade in
lavoratori is NOT caused by missing trackWrite — the saves are tracked.
It is caused by the fact that the three detail-effect `useEffect`s do
their own per-tick refetch driven by `realtimeTick`, which is independent
of the echo-window guard. The comment should be updated, but no code change
is required for the trackWrite mechanism itself.

## Findings (BYPASS)

### 1. `src/components/ricerca/ricerca-detail-view.tsx:1393` — `family-availability` edge function call

**Severity**: HIGH (high likelihood of triggering server-side row writes
visible to the client, runs immediately after a tracked `updateRecord`).

**Operation**: `await invokeEdgeFunction("family-availability", { processo_matching_id })`

**Why it's a bypass**: `invokeEdgeFunction` is called directly (not through
`updateRecord`/`createRecord`/`deleteRecord`, and not bracketed by
`beginPendingWrite`/`endPendingWrite`). If `family-availability` writes to
`processi_matching` (or any other subscribed table) to update derived
availability fields, the resulting realtime event arrives outside the 2.5 s
echo window of the preceding tracked save — or worse, after it, with an
unrelated `lastLocalWriteAt`. Per-keystroke saves to availability-related
fields would each trigger a separate, un-suppressed reload.

**Snippet**:

```ts
saveProcessPatch("orari", {
  orario_di_lavoro: ...,
  ore_settimanale: ...,
  ...,
});
await invokeEdgeFunction("family-availability", {
  processo_matching_id: currentProcessId,
});
toast.success("Orari e frequenza salvati");
```

**Suggested fix**: wrap the invoke in the existing pattern:

```ts
beginPendingWrite();
try {
  await invokeEdgeFunction("family-availability", {
    processo_matching_id: currentProcessId,
  });
} finally {
  endPendingWrite();
}
```

Or — better — expose a tracked helper in `anagrafiche-api.ts`
(`recomputeFamilyAvailability(processId)`) that internally uses
`trackWrite(invokeEdgeFunction(...))`, then call it from both bypass sites.

**Tests to add after fix**: existing `useRealtimeBoardSync` echo-window
tests cover the centralized path. After moving these invocations into a
tracked helper, add a unit test asserting that the helper bumps
`getMillisSinceLastLocalWrite()` to near-zero and increments
`getPendingWriteCount()` while in flight, then run `npm test`.

### 2. `src/components/crm/cards/onboarding-card.tsx:451` — `family-availability` edge function call

**Severity**: HIGH (same reasoning; this site is the throttled
`invokeFamilyAvailability` callback that runs 10 s after the last
availability-related edit, but also runs immediately when the user clicks
the manual recompute button — both paths emit unsuppressed realtime).

**Operation**: `await invokeEdgeFunction("family-availability", { processo_matching_id: cardId })`

**Why it's a bypass**: same as Finding 1 — direct edge invocation, no
trackWrite, no begin/endPendingWrite.

**Snippet**:

```ts
const invokeFamilyAvailability = React.useCallback(
  async (showToast: boolean) => {
    if (!cardId) return;
    try {
      await invokeEdgeFunction("family-availability", {
        processo_matching_id: cardId,
      });
      if (showToast) toast.success("Disponibilita famiglia ricalcolata");
    } catch (error) {
      ...
    }
  },
  ...
);
```

**Suggested fix**: identical to Finding 1 — wrap with begin/end or migrate
to a tracked helper in `anagrafiche-api.ts`.

**Tests to add after fix**: same as Finding 1.

### 3. `src/lib/availability-functions.ts:50` — `worker-availability` edge function call (`invokeWorkerAvailability`)

**Severity**: MEDIUM (callers are typically post-save fan-outs in
`use-selected-worker-editor`, `ricerca-workers-pipeline-view`,
`crm-pipeline-preview` etc.; the `worker-availability` function likely
writes computed availability rows. The cascade is per-save, not per
keystroke, but still un-suppressed.)

**Operation**: `return invokeEdgeFunction("worker-availability", { worker_id })`

**Why it's a bypass**: direct edge invoke without trackWrite. Called from
many sites (see `invokeWorkerAvailability` / `invokeWorkerAvailabilityForIds`),
each of which expects the call to silently recompute server-side rows.

**Snippet**:

```ts
export async function invokeWorkerAvailability(workerId: string | null | undefined) {
  const normalizedWorkerId = toId(workerId)
  if (!normalizedWorkerId) return null

  return invokeEdgeFunction("worker-availability", {
    worker_id: normalizedWorkerId,
  })
}
```

**Suggested fix**: wrap the invoke in `trackWrite(...)` inside this helper
(it is the single funnel for the function, so a one-line change covers all
callers):

```ts
return trackWrite(invokeEdgeFunction("worker-availability", { worker_id: normalizedWorkerId }))
```

This requires exporting `trackWrite` (currently file-private) — or, cleaner,
adding a small `runTrackedEdgeFunction(name, payload)` export in
`anagrafiche-api.ts` and using it here.

**Tests to add after fix**: existing hook tests on `useRealtimeBoardSync`
already cover the echo-window path through the centralized writers; a unit
test on `invokeWorkerAvailability` asserting `getPendingWriteCount() > 0`
during the in-flight phase and `getMillisSinceLastLocalWrite()` near zero
after resolution would lock the behavior in. Then `npm test`.

## Secondary concerns (verify before treating as bypass)

These calls are direct `invokeEdgeFunction` invocations without trackWrite,
but it is unclear whether the called function persists rows that the client
subscribes to. They are listed for follow-up:

- `src/lib/anagrafiche-api.ts:1560` — `runAutomationWebhook(...)`:
  forwards to a webhook. If any of `finance-request-invoice-data`,
  `finance-invoice-payment`, `workflow-smart-matching`, etc. ultimately
  write to a subscribed table, every call bypasses the echo-window.
  Callers: `creazione-annuncio-card.tsx:52`, `payroll-overview-view.tsx:523`.
- `src/lib/anagrafiche-api.ts:1570` — `runSmartMatchingForwardPreview(...)`:
  invokes `smartmatching-v21`. Even with `dry_run: false`, if it writes
  selection rows or scores, the echo is un-suppressed. Caller:
  `ricerca-workers-pipeline-view.tsx:2152`.
- `src/lib/stripe-connect-api.ts:13` — `create-stripe-connect-account`:
  one-shot user action that updates `lavoratori` row; the resulting echo
  would be un-suppressed but the user is not typing at that moment, so
  unlikely to cause a cascade.
- `src/lib/ai-generation.ts:18` — `invokeAiGenerationFunction(...)`: the
  three named functions write AI-generated text fields back to the row;
  echo un-suppressed but one-shot, low cascade risk.

If any of these are confirmed to write to subscribed tables, apply the
same fix: wrap with `trackWrite` (or `beginPendingWrite`/`endPendingWrite`).

## Verified covered (no action)

Sample of the ~65 write call sites that flow through the tracked central
writers (`updateRecord`, `createRecord`, `deleteRecord`) and are therefore
COVERED:

- `src/hooks/use-board-mutations.ts` callers (10 board hooks):
  - `src/hooks/use-chiusure-board.ts:344, 390, 425, 439, 473, 477, 481`
  - `src/hooks/use-assunzioni-board.ts:463`
  - `src/hooks/use-variazioni-board.ts:346, 388`
  - `src/hooks/use-payroll-board.ts:283, 321, 360`
  - `src/hooks/use-contributi-inps-board.ts:614, 646`
  - `src/hooks/use-ricerca-board.ts:508`
  - `src/hooks/use-riattivazioni-board.ts:268`
  - `src/hooks/use-support-tickets-board.ts:780, 812, 849`
  - `src/hooks/use-crm-assegnazione.ts:478`
  - `src/hooks/use-ricerca-workers-pipeline.ts:1050`
- Hooks with direct write calls (all through tracked writers):
  - `src/hooks/use-selected-worker-editor.ts:523, 603-604, 710, 739, 799, 815, 834, 851, 867`
  - `src/hooks/use-prove-colloqui-data.ts:451, 483`
  - `src/hooks/use-crm-pipeline-preview.ts:1969, 2028, 2089, 2093`
  - `src/hooks/use-rapporti-lavorativi-data.ts:334`
- Components (all through tracked writers):
  - `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:802, 807, 858, 914, 1381, 1806, 1811, 1814, 1826, 1831`
    (also uses explicit `beginPendingWrite`/`endPendingWrite` brackets at
    lines 940, 951, 961 — belt-and-braces, fine)
  - `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx` (14 sites)
  - `src/components/gestione-contrattuale/variazioni-board-view.tsx` (5 sites)
  - `src/components/gestione-contrattuale/chiusure-board-view.tsx:260, 300`
  - `src/components/gestione-contrattuale/riattivazioni-board-view.tsx:189, 219, 271, 311`
  - `src/components/ricerca/ricerca-workers-pipeline-view.tsx:1826, 2025, 2225`
  - `src/components/ricerca/ricerca-workers-map-view.tsx:1061`
  - `src/components/lavoratori/lavoratori-cerca-view.tsx:1533, 1568`
  - `src/components/lavoratori/gate1-view.tsx:3826, 3870`
  - `src/components/lavoratori/documents-card.tsx:574, 621`
  - `src/components/support/support-ticket-detail-sheet.tsx:393`
  - `src/components/payroll/payroll-overview-view.tsx:583, 619`
- `src/hooks/use-debounced-save.ts:75, 60, 88` — explicit `beginPendingWrite` /
  `endPendingWrite` brackets, plus the inner `onSave` typically calls a
  tracked writer.

## Recommendations

1. **Fix the three confirmed bypasses** (Findings 1-3) by wrapping the
   edge invocations in `trackWrite` (or a new `runTrackedEdgeFunction`
   helper in `anagrafiche-api.ts`). This is a 3-5 line change in
   `availability-functions.ts` plus 2 call-site changes (or zero if the
   helper is shared).
2. **Audit the secondary concerns** (`run-automation-webhook`,
   `smartmatching-v21`, AI generation, Stripe Connect) by checking the
   edge function source to confirm whether they write subscribed tables.
   Wrap any that do.
3. **Harden `use-board-mutations.ts`**: although currently all callers pass
   a tracked `mutationFn`, the wrappers cannot enforce this. Consider
   either (a) a lint rule that bans `invokeEdgeFunction` and `supabase.rpc`
   inside any `mutationFn` literal passed to `usePatchMutation` /
   `useMoveMutation` / `useCreateMutation`, or (b) move the `trackWrite`
   call up into the wrappers so any future `mutationFn` is automatically
   tracked regardless of what it calls.
4. **Update the stale comment** in `src/hooks/use-lavoratori-data.ts:1908-1910`
   — lavoratori saves DO go through trackWrite; the reason for skipping
   `realtimeTick` in that effect is different and should be re-documented.
