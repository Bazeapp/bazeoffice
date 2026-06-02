# Audit: draft resync without isEditing guard

Generated 2026-05-25 on branch `realtime-bug-class-plan`.

Context: this audit follows the fix landed in `src/hooks/use-selected-worker-editor.ts`
(commit `03ecdd3` on `main`), where per-section `if (!isEditingXxx) return` guards
were added before `setHeaderDraft / setAddressDraft / setAvailabilityDraft / …` calls
that were running unconditionally on every `selectedWorkerRow` change. Without the
guard, a realtime echo (a colleague saving on another tab, or even the user's own
debounced save round-tripping back through the row subscription) wipes the user's
in-progress edits.

The audit looks for the same class of bug in other components/hooks.

## Summary

- **7 TRUE POSITIVE** findings (high/medium-priority fixes).
- **1 NOTE** finding (server state in `useState` initializer with no resync —
  different smell, see `onboarding-decisione-lavoro-card.tsx`).
- Files inspected: ~25 (hooks under `src/hooks`, components under `src/components/crm/**`,
  `src/components/lavoratori/**`, `src/components/ricerca/**`,
  `src/components/gestione-contrattuale/**`).
- Candidates examined: ~20. False positives (effects with guards already in place, or
  effects that aren't draft resyncs): ~12.

The fixed file (`use-selected-worker-editor.ts`) was re-verified: all eight
section setters are now correctly gated on their respective `isEditing*` flags.

---

## Findings

### 1. `src/components/lavoratori/gate1-view.tsx:3742` — gate draft resynced on every `selectedWorkerRow` change

**Severity**: HIGH
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
React.useEffect(() => {
  setGateDraft({
    referenteIdoneita: asString(selectedWorkerRow?.referente_idoneita_id),
    referenteCertificazione: asString(selectedWorkerRow?.referente_certificazione_id),
    followupStatus: asString(selectedWorkerRow?.followup_chiamata_idoneita),
    descrizionePubblica: asString(selectedWorkerRow?.descrizione_pubblica),
    livelloItaliano: asString(selectedWorkerRow?.livello_italiano),
    ratingAtteggiamento: asInputValue(selectedWorkerRow?.rating_atteggiamento),
    ratingCuraPersonale: asInputValue(selectedWorkerRow?.rating_cura_personale),
    // …~15 more fields…
    pagaOrariaRichiesta: asInputValue(selectedWorkerRow?.paga_oraria_richiesta),
    dataScadenzaNaspi: asString(selectedWorkerRow?.data_scadenza_naspi),
    assessmentStatus: asString(selectedWorkerRow?.stato_lavoratore),
    assessmentFeedback: asString(selectedWorkerRow?.feedback_recruiter),
  });
}, [selectedWorkerRow]);
```
The component already declares `isEditingBazeChecks` and `isEditingAvailabilityStep`
(lines 3049/3051) — they're used to gate the UI's read-only/editable rendering, but
NOT the draft resync. `selectedWorkerRow` is realtime-driven via `use-lavoratori-data`.

**Why it's a bug**: When the recruiter is typing in `descrizionePubblica`,
`pagaOrariaRichiesta`, `assessmentFeedback`, or any of the rating fields and a
realtime echo arrives (their own debounced save, or a colleague's edit), the entire
`gateDraft` is replaced — the typed-but-not-yet-saved characters are lost.

**Suggested fix**: Split the effect by section and gate each setter, mirroring the
fix in `use-selected-worker-editor.ts`:
```ts
React.useEffect(() => {
  if (!selectedWorkerRow) return;
  if (isEditingAvailabilityStep && isEditingBazeChecks) return;
  setGateDraft((current) => ({
    ...current,
    // only resync fields whose section is NOT currently being edited
    …
  }));
}, [selectedWorkerRow, isEditingAvailabilityStep, isEditingBazeChecks]);
```
Or, better, lift `gateDraft` into `use-selected-worker-editor` and reuse the same
per-section gating already proven there.

**Tests to add after fix**: Regression test analogous to the one for
`use-selected-worker-editor.integration.test.tsx`: render gate1 with a worker,
simulate user typing into `descrizionePubblica`, fire a realtime row update with a
different value for an unrelated field, assert the typed value survives.

---

### 2. `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx:431` and `:497` — large draft resync on `defaults` change

**Severity**: HIGH
**Pattern**: TRUE POSITIVE (no guard)
**Snippet** (one of the two; the second `useEffect` at line 497 follows the same
shape for ~12 text/number/array inputs: `descrizioneTrasferte`, `descrizioneFerie`,
`patenteDettaglio`, `nucleoFamigliare`, `descrizioneCasa`, `metraturaCasa`,
`descrizioneAnimaliInCasa`, `mansioniRichieste`, `informazioniExtraRiservate`,
`etaMin`, `etaMax`, `nazionalitaEscluse`, `nazionalitaObbligatorie`):
```ts
React.useEffect(() => {
  setRichiestaTrasferte(defaults?.richiestaTrasferte ?? checkboxDefaults?.["…"] ?? false);
  setRichiestaFerie(defaults?.richiestaFerie ?? checkboxDefaults?.["…"] ?? false);
  setRichiestaPatente(defaults?.richiestaPatente ?? checkboxDefaults?.["…"] ?? false);
  setGenere(normalizeGenderValue(defaults?.sesso));
  setPersistedCheckboxes({ /* ~18 checkboxes */ });
}, [checkboxDefaults, defaults?.richiestaTrasferte, defaults?.richiestaFerie, …]);
```
`defaults` is derived from the realtime-driven `CrmPipelineCardData`. Sister card
`onboarding-card.tsx` already documents the smell at line 388-389 (it deliberately
avoids local mirrors for the same reason) — this file did not get the same
treatment.

**Why it's a bug**: While the user is typing into `descrizioneTrasferte` /
`mansioniRichieste` / `informazioniExtraRiservate` / `etaMin`/`etaMax`, a realtime
echo on any *other* `defaults.*` field listed in the deps array will fire the effect
and reset every controlled input back to the server value. The checkbox effect at
line 431 has the same risk for any user toggling a checkbox while another field
changes remotely.

**Suggested fix**:
1. Preferred: replace the per-field `useState` + `useEffect` pairs with
   `useDebouncedSave` — it has the canonical `hasUserEditedRef` guard.
2. Otherwise: track a `dirtyRef` per field group and skip the setter when dirty.
3. The sibling pattern used in `onboarding-card.tsx` — drop the local mirror and
   compute the input value directly from `card?.xxx` — is the cleanest if the inputs
   are already debounced inside `DebouncedInput`.

**Tests to add after fix**: Render the card, type into `descrizioneTrasferte`,
trigger a `defaults` prop change with a new `richiestaFerie`, assert the typed text
is still present.

---

### 3. `src/components/crm/cards/onboarding-card.tsx:418` and `:422` — `indirizzoProvincia` / `deadline` / `tipoIncontro` resynced unconditionally

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
React.useEffect(() => {
  setIndirizzoProvincia(toInputValue(card?.indirizzoProvincia));
}, [card?.id, card?.indirizzoProvincia]);

React.useEffect(() => {
  setDeadline(toInputValue(card?.deadlineMobile));
  setTipoIncontro(toInputValue(card?.tipoIncontroFamigliaLavoratore));
}, [card?.id, card?.deadlineMobile, card?.tipoIncontroFamigliaLavoratore]);
```
The file itself contains the comment at lines 388-389: *"No local useState mirror to
avoid Realtime echo resetting user edits."* — applied to the availability fields,
but these three legacy `useState` mirrors slipped through.

**Why it's a bug**: A realtime echo on `card.indirizzoProvincia` while the user is
mid-edit resets the input. Same for `deadline` and `tipoIncontro`.

**Suggested fix**: Drop the local `useState` (the inputs are already wrapped in
`DebouncedInput`/`DatePicker` that take a committed value) and bind directly to
`card?.indirizzoProvincia` etc., as the comment on lines 388-389 recommends. If the
local state is needed for transient UI, gate the setter on `useDebouncedSave`-style
`hasUserEditedRef`.

**Tests to add after fix**: Type in the province field, simulate realtime card
update, assert typed value survives.

---

### 4. `src/components/crm/cards/onboarding-context-card.tsx:537` — `dataRicontatto` / `dataCall` / `coldAttempts` / `noShowAttempts` resync

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
React.useEffect(() => {
  setDataRicontatto(card?.dataPerRicercaFuturaRaw ? card.dataPerRicercaFuturaRaw.slice(0, 10) : "");
  setDataCall(toDateTimeLocalValue(card?.dataCallPrenotataRaw));
  setColdAttempts(splitStoredValues(card?.salesColdCallFollowup));
  setNoShowAttempts(splitStoredValues(card?.salesNoShowFollowup));
}, [
  card?.appuntiChiamataSales,
  card?.dataPerRicercaFuturaRaw,
  card?.dataCallPrenotataRaw,
  card?.salesColdCallFollowup,
  card?.salesNoShowFollowup,
  card?.id,
]);
```
`card` is the realtime-driven `CrmPipelineCardData`.

**Why it's a bug**: User toggling a cold-call checkbox while a date arrives via
realtime → checkbox state replaced. Date pickers similarly reset mid-edit.

**Suggested fix**: Migrate to `useDebouncedSave` or split the effect with a
per-section `isEditing*` flag. The followup checkbox lists (`coldAttempts`,
`noShowAttempts`) are committed immediately in the `onChange` handler at lines
569-574, so they could be made fully derived from props (no local mirror).

**Tests to add after fix**: Toggle a cold-call attempt while firing a realtime
`dataPerRicercaFuturaRaw` change; assert toggled state survives.

---

### 5. `src/components/ricerca/worker-pipeline-summary-cards.tsx:548` and `:568` — worker address and family address drafts resynced unconditionally

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
React.useEffect(() => {
  setAddressDraft({
    via: asString(workerVia), civico: asString(workerCivico),
    cap: asString(workerCap), citta: asString(workerCitta),
    provincia: asString(workerProvincia), citofono: asString(workerCitofono),
    mobilita: readArrayStrings(workerRow.come_ti_sposti).join(", "),
  });
}, [workerVia, workerCivico, workerCap, workerCitta, workerProvincia,
    workerCitofono, workerRow.come_ti_sposti]);

React.useEffect(() => {
  setFamilyAddressDraft({ provincia, cap, indirizzo, via, civico, comune, citofono, note });
}, [familyAddress, familyAddressNote, familyCap, familyCivicNumber, …]);
```
Used inside `RicercaWorkersPipelineView`, which is on a board with `useRealtimeBoardSync`.

**Why it's a bug**: Typing in any worker-address or family-address field while a
sibling field is updated remotely will reset the in-progress field. There is no
`isEditing*` flag; commits go through `commitAddressField` on blur.

**Suggested fix**: Either migrate each input to `DebouncedInput` + `useDebouncedSave`
(which already has the `hasUserEditedRef` guard), or introduce a `dirtyRef`-style
gate before each setter.

**Tests to add after fix**: Type into worker `civico`, fire realtime update on
worker `cap`, assert `civico` still has the in-progress value.

---

### 6. `src/components/ricerca/selection-details-card.tsx:155` — draft resynced on every `selectionRow` change

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
const [draft, setDraft] = React.useState<SelectionDraft>(() => buildDraft(selectionRow))

React.useEffect(() => {
  setDraft(buildDraft(selectionRow))
}, [selectionRow])
```
`selectionRow` is part of the ricerca pipeline (realtime-driven). The draft holds
`stato_selezione`, `note_selezione`, `followup_senza_risposta`,
`motivo_archivio`, `motivo_non_selezionato`, `motivo_no_match`.

**Why it's a bug**: Same pattern — `note_selezione` is a free-text textarea; while
the recruiter is typing a note, a realtime echo on any field (e.g. another tab
saved `stato_selezione`) replaces the whole draft and the in-progress note is lost.

**Suggested fix**: Per-field gate (each field already has its own setter call site
at lines 198/229/243/266/297/328/345). Wrap the resync with either:
- A `previousSelectionIdRef` check so only an identity change resyncs (acceptable
  if all field commits are immediate), or
- An `isDirtyRef` (set in each `onValueChange`, cleared after save settles) and skip
  the resync while dirty.

**Tests to add after fix**: Type a partial note, dispatch a realtime
`selectionRow` change for an unrelated field, assert the typed text survives.

---

### 7. `src/components/ricerca/scheda-colloquio-panel.tsx:374` — draft resynced on every `selectionRow` change

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard)
**Snippet**:
```ts
React.useEffect(() => {
  const nextDraft = buildDraft(selectionRow);
  slotColloquioRef.current = nextDraft.slotColloquio;
  setDraft(nextDraft);
}, [selectionRow]);
```
Draft holds colloquio slots, scores (`scoreDistanzaOrari`, `scoreEsperienze`,
`scorePaga9Euro`, `scoreOverall`), motivazioni, status.

**Why it's a bug**: Same class — user editing a score while another reviewer saves
on another tab → score reset to old/server value. Scores are entered via debounced
inputs at lines 595-625 but the local `draft` is a state mirror that snaps back on
every `selectionRow` change.

**Suggested fix**: Drop the local draft for fields that are saved immediately
(scores, motivazioni) and read directly from `selectionRow`; or gate the resync
with a `dirtyRef`.

**Tests to add after fix**: Type a score, fire realtime selectionRow update,
assert the score survives.

---

### 8. `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx:1929` — `practiceDraft` resynced when any card field in deps changes

**Severity**: MEDIUM
**Pattern**: TRUE POSITIVE (no guard, transitive via `makePracticeDraft`)
**Snippet**:
```ts
const makePracticeDraft = React.useCallback(
  () => ({
    statoAssunzione: card?.stage ?? "",
    tipoRapporto: card?.tipoRapporto ?? "",
    tipoContratto: card?.rapporto?.tipo_contratto ?? "",
    dataAssunzione: card?.rapporto?.data_inizio_rapporto ?? "",
    idRapportoInps: card?.rapporto?.id_rapporto ?? "",
    codiceRapportoWebcolf: …,
    codiceLavoratoreWebcolf: …,
  }),
  [card?.rapporto?.codice_datore_webcolf, card?.rapporto?.codice_dipendente_webcolf,
   card?.rapporto?.data_inizio_rapporto, card?.rapporto?.id_rapporto,
   card?.rapporto?.tipo_contratto, card?.stage, card?.tipoRapporto],
)
const [practiceDraft, setPracticeDraft] = React.useState(makePracticeDraft)
// …
React.useEffect(() => {
  setPracticeDraft(makePracticeDraft())
}, [makePracticeDraft])
```
The board uses `useRealtimeBoardSync` (assunzioni); any realtime echo that touches
one of the 7 source fields recomputes `makePracticeDraft` and overwrites the entire
draft.

**Why it's a bug**: User is typing `idRapportoInps` or `codiceRapportoWebcolf` (free
text). A colleague saves `tipo_contratto` on another tab — the entire `practiceDraft`
resets, wiping the in-progress text. Note the sibling effects at lines 464/774/1194
in the same file *are* safer: they only resync when the identity-level deps
(`assunzione?.id`, `card.id`, `rapporto?.id`) change. This one is the outlier.

**Suggested fix**: Either:
1. Pin the resync to identity-only deps (`card?.id`, `card?.rapporto?.id`) like the
   sibling effects do (with an `eslint-disable-next-line react-hooks/exhaustive-deps`
   and a comment explaining why), or
2. Migrate each field to `useDebouncedSave`/`DebouncedInput` so the local mirror is
   unnecessary.

**Tests to add after fix**: Type into `idRapportoInps`, simulate a realtime card
update changing `tipo_contratto`, assert the typed value survives.

---

## Worth-a-note (different but related smell)

### N1. `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx:367-429` — many `useState` initializers derived from `defaults` prop

**Severity**: NOTE (this one is already partially mitigated by Findings #2's two
sync effects; without those it would be a "stale state" bug instead of a
"wipe edits" bug).
**Pattern**: NOTE (useState from prop)
**Snippet**:
```ts
const [descrizioneTrasferte, setDescrizioneTrasferte] = React.useState(
  toInputValue(defaults?.descrizioneRichiestaTrasferte),
)
const [nucleoFamigliare, setNucleoFamigliare] = React.useState(
  toInputValue(defaults?.nucleoFamigliare),
)
// …~12 more useState mirrors of defaults?.xxx…
```
This is the exact smell the docstring of `src/components/crm/cards/onboarding-card.tsx`
warns about (see comment "No local useState mirror to avoid Realtime echo
resetting user edits."). The card has chosen the *opposite* trade-off — it keeps
the local mirror, then resyncs it via the effects flagged in Finding #2.

**Why it's worth flagging**: When the fix for #2 lands, the choice will be: keep
the mirror + add proper `dirtyRef` guards, or drop the mirror entirely (the
inputs are `DebouncedInput`/`DebouncedTextarea` already, so binding directly to
`defaults?.xxx` should work). The latter aligns with the documented house style
in `onboarding-card.tsx`.

---

## Notes on false positives ruled out

- `src/hooks/use-selected-worker-editor.ts` — re-verified: all eight per-section
  setters at lines 442-455 are now correctly gated. The fix from commit `03ecdd3`
  is intact.
- `src/components/lavoratori/worker-profile-header.tsx:236` — already has
  `if (isEditing) return` (line 237).
- `src/components/crm/crm-assegnazione-view.tsx:494` — already has
  `if (!isEditingScheduling) setSchedulingDraft(...)` (line 497). Identity-change
  branch is the "always resync" path, intentional.
- `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx:464, :774, :1194`
  — three `setDraft` effects but the deps are pinned to identity (`assunzione?.id`,
  `card.id`, etc.) with `eslint-disable-next-line react-hooks/exhaustive-deps` and a
  comment. They do NOT fire on field-level realtime echoes, so safe.
- `src/components/lavoratori/experience-references-card.tsx:328, :465` — these are
  "reset after submit" patterns in create dialogs, not server-state resyncs.
- `src/components/gestione-contrattuale/rapporti-list-panel.tsx:340` — mirrors
  `externalSearchValue` (UI state, not server data).
- `src/components/lavoratori/gate1-view.tsx:3687, :3691` — reset edit-mode flags
  and active section on worker switch; not draft resyncs.
- `src/components/crm/famiglia-processo-detail-content.tsx` — header field uses
  `useDebouncedSave` (which has the canonical `hasUserEditedRef` guard).

---

## Recommended order of fixes

1. **Finding #1 (gate1-view `gateDraft`)** — same severity and surface area as the
   one we just fixed; touches the same `selectedWorkerRow` source.
2. **Finding #2 (onboarding-decisione-lavoro-card)** — large free-text inputs that
   recruiters fill in; high probability of mid-edit echo.
3. **Findings #3, #4 (onboarding-card, onboarding-context-card)** — same CRM
   pipeline, smaller surface but same pattern.
4. **Findings #5, #6, #7, #8** — board detail panels (ricerca, gestione
   contrattuale); fix in the order users actually edit these (ricerca tends to be
   higher-volume).
5. **Note N1** — naturally subsumed by the fix for #2.
