# Audit: missing key= on detail wrappers

Generated 2026-05-25 on branch `realtime-bug-class-plan`.

## Summary

- 16 detail-style wrappers inspected across `src/components/**/*-view.tsx` and
  related views (boards, pipeline, list+detail combos).
- **1 TRUE POSITIVE** (selection-bound wrapper hosts `useDebouncedSave` drafts
  without a `key=` reset).
- 13 VERIFIED (key= present on every top-level `Detail(Sheet|Panel|Shell)`
  wrapper covered by the ESLint rule in `eslint.config.js:172-181`).
- 2 OUT-OF-SCOPE (selection-bound but read-only, so a cross-record leak is
  impossible; documented for completeness).
- Existing audit script `scripts/audit-autosave-risk.mjs` does NOT cover this
  check (its PATTERNS array targets onBlur/draft-save constructs, not JSX
  `key=` attributes). Ran it for completeness: 3 findings, none related to
  the key= pattern. The audit below is therefore a fresh manual pass.

## Findings (TRUE POSITIVE)

### 1. `src/components/ricerca/ricerca-workers-pipeline-view.tsx:2510` — `<SchedaColloquioPanel>`

**Severity**: HIGH — Ricerca pipeline is realtime-active, the panel is the
primary editor of selection (`selezioni_lavoratori`) rows, and a recruiter
typically switches across rows in rapid succession.

**Parent component**: `RicercaWorkersPipelineView` (file is a top-level view).

**Selection state**: `selectedSelectionRow` (driven by `selectedWorkerId` /
worker selection in the same view, around lines 1042 and 2420).

**Snippet** (no `key={...}` on the opening tag):

```tsx
<SchedaColloquioPanel
  selectionRow={selectedSelectionRow}
  nonSelezionatoOptions={
    lookupOptionsByDomain.get(
      "selezioni_lavoratori.motivo_non_selezionato",
    ) ?? []
  }
  noMatchOptions={
    lookupOptionsByDomain.get(
      "selezioni_lavoratori.motivo_no_match",
    ) ?? []
  }
  isGeneratingFeedback={generatingSelectionFeedback}
  onGenerateFeedback={handleGenerateSelectionFeedback}
  onPatchField={patchSelectedSelectionField}
/>
```

**Why it's a bug**: `SchedaColloquioPanel`
(`src/components/ricerca/scheda-colloquio-panel.tsx:360-470+`) hosts ~10
`useDebouncedSave(...)` calls (`vannoBeneGiorni`, `vannoBeneOrari`,
`distanzaImpegni`, `accettaStipendio`, `proMotivazioni`,
`aspettiDivergenza`, `feedbackBaze`, `dataOraColloquio`, etc.).
`useDebouncedSave` (`src/hooks/use-debounced-save.ts:29`) keeps a
`hasUserEditedRef` that gates whether incoming committed values overwrite
the local draft. When the user types into row A and then clicks row B,
the parent only changes the `selectionRow` prop; the panel does NOT
remount, the refs survive, and B will display A's draft (or persist A's
draft into B on the next debounce tick).

The internal `React.useEffect` that resets `draft` on `selectionRow`
change (line 374) handles only the local `draft` object, not the
`useDebouncedSave` hooks' `hasUserEditedRef`. The only safe reset is a
remount.

**Suggested fix**:
```tsx
<SchedaColloquioPanel
  key={selectedSelectionRow?.id ?? "__empty__"}
  selectionRow={selectedSelectionRow}
  ...
/>
```
(Use whatever stable id the selection row exposes — likely
`selectedSelectionRow.id` or `selectedWorkerId`; verify at fix time.)

**Note on the lint rule**: the ESLint rule in `eslint.config.js:172-181`
only matches wrapper names ending in `Detail(Sheet|Panel|Shell)$`.
`SchedaColloquioPanel` does NOT match that pattern and therefore slipped
past automated enforcement. Consider widening the regex (e.g. add
`|Scheda.*Panel`) or adding `SchedaColloquioPanel` to a small allow-list
once fixed.

**Tests to add after fix**: pattern is already covered by
`src/test/key-unmount-pattern.integration.test.tsx`. Add a Ricerca-specific
integration test that opens worker A → types into "Vanno bene giorni" →
selects worker B → asserts the field is empty (not carrying A's draft).

## Verified safe (key= present)

All seven `DetailSheet/Panel/Shell` top-level wrappers identified by Task
`#11. Layer 1: key= sui 7 wrapper detail` plus six more that were added
during the realtime board waves:

- `src/components/crm/crm-pipeline-famiglie-view.tsx:879` — `<FamigliaProcessoDetailShell key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/crm/crm-assegnazione-view.tsx:1619` — `<AssegnazioneDetailSheet key={selectedCardFromState?.id ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/chiusure-board-view.tsx:953` — `<ChiusureDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/variazioni-board-view.tsx:1282` — `<VariazioniDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/assunzioni-board-view.tsx:392` — `<AssunzioniDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/riattivazioni-board-view.tsx:691` — `<RiattivazioniDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/rapporti-lavorativi-view.tsx:68` — `<RapportoDetailPanel key={selectedRapportoId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1797` — nested `<CedolinoDetailSheet key={selectedCedolinoId ?? "__empty__"}>` ✓
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1817` — nested `<ContributoInpsDetailSheet key={selectedContributoId ?? "__empty__"}>` ✓
- `src/components/support/support-tickets-view.tsx:413` — `<SupportTicketDetailSheet key={selectedTicketId ?? "__empty__"}>` ✓
- `src/components/payroll/contributi-inps-view.tsx:919` — `<ContributoInpsDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/payroll/payroll-overview-view.tsx:1523` — `<CedolinoDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/prove-colloqui/prove-colloqui-view.tsx:1310` — `<ProvaDetailSheet key={selectedCardId ?? "__empty__"}>` ✓
- `src/components/lavoratori/lavoratori-cerca-view.tsx:1636` — `<WorkerDetailShell key={selectedWorkerId ?? "__empty__"}>` ✓
- `src/components/lavoratori/gate1-view.tsx:4109` — `<WorkerDetailShell key={selectedWorkerId ?? "__empty__"}>` ✓ (also covers Gate 2 since `gate2-view.tsx` delegates entirely to `Gate1View`)

## Wrappers reviewed and intentionally skipped

These appear in the grep results for `*Sheet|*Panel|*Drawer|*Shell` but are
NOT selection-bound detail editors. No fix needed.

- `src/components/lavoratori/worker-detail-composite.tsx:85` —
  `<WorkerDetailShell>` without `key=`. **Skipped**: this is a *composite*
  child rendered inside a parent that already keys `WorkerDetailShell`
  (lavoratori-cerca-view.tsx:1636 and gate1-view.tsx:4109). The composite
  is itself the body of a keyed wrapper, so it remounts whenever the
  parent does.
- `src/components/lavoratori/recruiter-feedback-sheet.tsx:24` —
  read-only display of `entries`. No `useState`/`useDebouncedSave` drafts.
  Cross-record leak impossible.
- `src/components/anagrafiche/anagrafiche-tables-view.tsx:1055` —
  `<AnagraficaRecordSheet>`. Read-only sheet (renders only
  `renderReadonlyValue(row[field])`); no inputs, no drafts.
- `src/components/prove-colloqui/prove-colloqui-view.tsx:1326` —
  `<ColloquioSheet>`. Selection-bound on `selectedColloquio` BUT contains
  only a `<Select>` whose `onValueChange` fires `patchProcess` immediately;
  no `useState` drafts, no `useDebouncedSave`. Save-on-change pattern is
  immune to the bug class. Listed here so a future audit can confirm the
  status if inputs are added later.
- `src/components/gestione-contrattuale/rapporti-list-panel.tsx:506`,
  `src/components/crm/crm-assegnazione-view.tsx:1271`,
  `src/components/lavoratori/lavoratori-cerca-list-panel.tsx:69`,
  `src/components/lavoratori/gate1-view.tsx:3951` — all `<SideCardsPanel>`
  usages. SideCardsPanel is the **list** half of the list+detail layout
  (it does not host detail editors); selection-driven content is in its
  sibling Detail wrapper which is already keyed.

## Constraints respected

- No source files modified. Audit only.
- Realtime-active pages were prioritized (Cerca/Gate1/Gate2, Ricerca
  pipeline, CRM pipeline, Chiusure, Variazioni, Assunzioni, Riattivazioni,
  Assegnazione, Support, Cedolini, Contributi, Prove&Colloqui, Rapporti).
- ESLint rule `eslint.config.js:172-181` does NOT catch
  `SchedaColloquioPanel` because the selector matches only
  `/Detail(Sheet|Panel|Shell)$/`. Recommend extending the rule once the
  fix is applied.
