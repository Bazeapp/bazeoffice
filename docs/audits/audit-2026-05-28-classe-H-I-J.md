# Audit Classe H (Lookup mismatch) + I (Stale closure) + J (Missing key=)

Data: 2026-05-28
Scope: tutto `src/`, focus su `src/components/`, `src/hooks/`.

## Sommario

| Classe | File analizzati | BUG confermati | DUBBI | FALSI POSITIVI |
|---|---|---|---|---|
| H. Lookup mismatch (value_key vs value_label) | ~30 (tutti i Select che usano `lookupOptionsByDomain`/`lookupOptionsByField`) | 1 | 1 | 5 |
| I. Stale closure (useCallback/useMemo deps incomplete con eslint suppression) | 19 occorrenze `eslint-disable.*exhaustive-deps` in `src/` | 0 | 1 | 18 |
| J. Missing `key=` su detail wrapper | 13 detail wrapper + 4 componenti annidati che gestiscono draft | 2 | 0 | 11 |

---

## Contesto (riferimento canonical lookup)

`src/features/lavoratori/lib/lookup-utils.ts` definisce la convenzione FE: dato un lookup row `(value_key, value_label)`, la mappa restituita da `normalizeLookupOptions` ha `{value: value_key, label: value_label}`.

`supabase/audit_lookup_normalized_values.sql` definisce la convenzione DB: nelle colonne `text`/`ARRAY` target è considerato "contamination" il valore == `value_key` quando `value_key ≠ value_label`. **Il DB attende `value_label`**.

Helper di traduzione FE → DB: `getLookupLabelForSave(value, options)` traduce `option.value` (=key) nel `option.label` (=label) prima del patch.

In `src/hooks/use-crm-pipeline-preview.ts:544` esiste `normalizeLookupPatchLabels(patch, lookupOptionsByField)`: applicato dentro `updateProcessCard` e `updateFamilyCard`, traduce automaticamente i `value_key` in `value_label` per qualunque colonna `processi_matching.*` / `famiglie.*` con dominio noto. Questa funzione è il "safety net" che permette ai card di scrivere indifferentemente key o label e ottenere comunque label in DB **purché passino dal hook**.

---

## Classe H — Lookup mismatch

### BUG H1 — `ColloquioSheet` in prove-colloqui scrive label per `tipo_incontro_famiglia_lavoratore` ma il path NON passa da `normalizeLookupPatchLabels`

File:
- `src/components/prove-colloqui/prove-colloqui-view.tsx:1176-1182`
- `src/hooks/use-prove-colloqui-data.ts` (definizione di `patchProcess`)

Flow:
```tsx
// prove-colloqui-view.tsx:1176
const nextValue = next === "none" ? null : getLookupLabelForSave(next, tipoIncontroOptions)
void patchProcess(processId, { tipo_incontro_famiglia_lavoratore: nextValue, })
```

`getLookupLabelForSave` produce correttamente la **label**. `patchProcess` in `use-prove-colloqui-data.ts` chiama `updateRecord("processi_matching", ...)` direttamente, senza passare per `normalizeLookupPatchLabels`. Il valore arriva quindi al DB come label — coerente con la convenzione DB. **In sé non è un bug**.

**Il bug emerge** quando lo stesso campo `tipo_incontro_famiglia_lavoratore` viene scritto in modo non-uniforme dai diversi consumatori e il safety net non c'è:

- `src/components/crm/cards/onboarding-card.tsx:1227` → `getLookupLabelForSave(...)` → label (path attraverso `patchProcess` esposto da `famiglia-processo-detail-content.tsx` che NON passa da `normalizeLookupPatchLabels`)
- `src/components/ricerca/ricerca-detail-view.tsx:1697` → scrive `next` (= valueKey) → MA passa attraverso `updateProcessCard` che applica `normalizeLookupPatchLabels` (linea 1273-1276). Salvataggio in label, **safe**.
- `src/components/prove-colloqui/prove-colloqui-view.tsx:1178` → scrive label tramite `getLookupLabelForSave` (sopra). Salvataggio in label, **safe**.

Verificando `famiglia-processo-detail-content.tsx`, `onboarding-card.tsx` riceve `patchProcess` come prop da `FamigliaProcessoDetailContent`. Da `crm-pipeline-famiglie-view.tsx:879+` viene passato `onPatchProcess={async (id, patch) => { await updateProcessCard(id, patch) }}` dove `updateProcessCard` è quello hook-ato con normalize. Quindi è **safe per CRM**.

**BUG H1 reale**: il path `patchProcess` di `use-prove-colloqui-data.ts` chiama `updateRecord` direttamente. Se in futuro un nuovo Select viene aggiunto al `ColloquioSheet` senza ricordarsi del `getLookupLabelForSave`, il valore arriverà come key in DB e diventerà contamination. **Non un bug attivo oggi**, ma fragile.

**Status corretto**: marker downgradato a DUBBIO. Vedi sotto.

### DUBBIO H2 — `ricerca-detail-view.tsx` Select `stato_res`/`tipo_incontro_famiglia_lavoratore`/`motivo_no_match` scrive valueKey, ma il safety net normalizza

File: `src/components/ricerca/ricerca-detail-view.tsx:1602-1747`

```tsx
// 1607: stato_res
void updateProcessCard?.(resolvedCard.id, { stato_res: next || null });
// 1697: tipo_incontro_famiglia_lavoratore
void updateProcessCard?.(resolvedCard.id, { tipo_incontro_famiglia_lavoratore: next || null });
// 1728: motivo_no_match
void updateProcessCard(currentProcessId, { motivo_no_match: next || null });
```

`<SelectItem value={option.valueKey}>` ⇒ `next` = valueKey. Sembra contamination MA `updateProcessCard` (linea 1273) chiama `normalizeLookupPatchLabels(patch, lookupOptionsByField)` PRIMA del patch. Il safety net riscrive sempre il `value_key` → `value_label`.

**Verdetto**: NON è un bug oggi. Tuttavia:
- Se `lookupOptionsByField[field]` è vuoto (es. carico lookup fallito), `normalizeLookupPatchValue` ritorna il valore unchanged → il valueKey raggiunge il DB.
- Se in futuro un nuovo dominio non viene caricato nel `lookupOptionsByField` (regex non match con `processi_matching`), il safety net fallisce silenziosamente.

**Raccomandazione**: convertire i SelectItem a `value={option.valueLabel}` per essere coerenti, oppure rendere `normalizeLookupPatchValue` fail-loud quando ricevuto un value non riconosciuto.

### FALSI POSITIVI H

- `src/components/crm/cards/stato-lead-card.tsx:298-326`: `RadioGroupItem value={option.valueKey}` + `onValueChange={(next) => onPatchProcess(card.id, {sales_cold_call_followup: next})}`. Scrive valueKey, MA il path arriva a `updateProcessCard` hook-ato che normalizza. Safe.
- `src/components/crm/cards/onboarding-card.tsx:1224-1241`, `onboarding-card.tsx:1293-1310`: scrive label via `getLookupLabelForSave`. Safe.
- `src/components/crm/cards/onboarding-context-card.tsx:692-722`: `stato_res: next` (valueKey). Path verso `updateProcessCard`. Safe.
- `src/components/crm/crm-assegnazione-view.tsx:565-568`: `stato_res: "fare ricerca"` (label form). Path va a `onPatchCard` definito a `crm-assegnazione-view.tsx` interno; `commitSchedulingDraft` converte intenzionalmente key → label tramite `toAssegnazioneStatusPatch` in `src/hooks/use-crm-assegnazione.ts:240`. Coerente con DB.
- `src/components/lavoratori/lavoratori-cerca-view.tsx:2165-2173` `<SelectItem value={option.label}>`: il Select.value è già il label, quindi `onValueChange(value)` produce label. Scrive label. Safe (è solo un atto di accorciatoria del normale pattern, ma non sbagliato).

---

## Classe I — Stale closure (eslint-disable.*exhaustive-deps)

19 sospensioni totali in `src/`. Tutte ispezionate. Ognuna è documentata come pattern intenzionale "identity-pin" (rebuild draft solo su id change, NON su body change) o "ref-flush on unmount". Nessuna è un BUG attivo.

### DUBBIO I1 — `assunzioni-detail-sheet.tsx:1989` loader di lookup options dipende solo da `[open]`

File: `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx:1929-1990`

```tsx
React.useEffect(() => {
  // ...
  setStatoAssunzioneOptions(
    buildLookupOptions(response.rows, "processi_matching", "stato_assunzione", card?.stage ?? null)
  )
  // ...
  // Options derive from the static lookup domain, not from the current
  // card values. Including card fields in the deps would re-fetch on every
  // autosave and cause a network round-trip per keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open])
```

Il body legge `card?.stage`, `card?.tipoRapporto`, `card?.process?.offerta` per costruire un fallback. Se `<AssunzioniDetailSheet>` venisse riusato su una card diversa SENZA remount, il fallback sarebbe stale. **MITIGATO**: il parent `AssunzioniBoardView` rende `<AssunzioniDetailSheet key={selectedCardId ?? "__empty__"}>` (linea 393), quindi il componente si remonta su switch card. Stale closure non raggiungibile. **Safe**.

Si segnala come dubbio perché la safety dipende interamente dal `key=` esterno: se domani qualcuno toglie il key, il bug riemerge silenziosamente.

### FALSI POSITIVI I (campione)

- `src/hooks/use-debounced-save.ts:48-65`: unmount flush effect. `[]` deps intenzionali — il punto è leggere `onSaveRef.current` al momento dell'unmount.
- `src/components/ricerca/selection-details-card.tsx:162`, `src/components/ricerca/scheda-colloquio-panel.tsx:383`, `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx:577,1201,1935`, `src/components/gestione-contrattuale/chiusure-board-view.tsx:165,176,867`, `src/components/gestione-contrattuale/variazioni-board-view.tsx:1197`, `src/components/payroll/contributi-inps-view.tsx:766`, `src/hooks/use-rapporti-lavorativi-data.ts:576`: tutte identity-pin (deps `[entity?.id, ...]`) per evitare reset durante editing locale. Documentate inline.
- `src/components/data-table/data-table.tsx:310`, `src/components/gestione-contrattuale/rapporti-list-panel.tsx:397`, `src/hooks/use-realtime-rows.ts:60`: incompatible-library / `tablesKey`-based dep canonicalization. Safe.
- `src/test/draft-resync-tier2.integration.test.tsx:70`: file di test.

---

## Classe J — Missing `key=` su detail wrapper

### BUG J1 — `<WorkerProfileHeader>` in `ricerca-workers-pipeline-view.tsx` non si re-monta su switch worker

File parent: `src/components/ricerca/ricerca-workers-pipeline-view.tsx:2378-2530`
File child: `src/components/lavoratori/worker-profile-header.tsx:228-243`

L'overlay `{isWorkerOverlayOpen ? (...)}` resta montato mentre l'utente naviga tra worker diversi nella stessa pipeline. `<WorkerProfileHeader>` è renderizzato a linea 2429 SENZA `key`:

```tsx
// ricerca-workers-pipeline-view.tsx:2429
<WorkerProfileHeader
  worker={selectedWorker ?? selectedCard.worker}
  workerRow={{ ...selectedWorkerRow, ... }}
  // ...
/>
```

Internamente `WorkerProfileHeader` ha:
```tsx
// worker-profile-header.tsx:228
const [isEditing, setIsEditing] = React.useState(false)
const [draft, setDraft] = React.useState<WorkerProfileHeaderDraft>(() => buildDraft(workerRow))

React.useEffect(() => {
  if (isEditing) return
  setDraft(buildDraft(workerRow))
}, [workerRow, isEditing])

React.useEffect(() => { setIsEditing(false) }, [worker.id])
```

L'effect `[worker.id]` resetta `isEditing` su switch worker, ma:
1. Gli `useDebouncedSave` interni (linee 309-340) hanno `hasUserEditedRef.current` che **rimane true** dopo il primo edit dell'utente; il commit del valore dal nuovo worker è bloccato dal pattern di `use-debounced-save.ts:38-42`.
2. Risultato: l'utente edita "nome" sul worker A, fa switch al worker B → il campo nome mostra ancora la bozza di A finché non si edita nuovamente. Su unmount finale, il debounce flush salva la bozza di A nel worker B (worst case).

**Fix**: aggiungere `key={selectedWorkerRow?.id ?? "__empty__"}` al `<WorkerProfileHeader>` linea 2429.

### BUG J2 — `<WorkerPipelineSummaryCards>` in `ricerca-workers-pipeline-view.tsx` non si re-monta su switch worker

File parent: `src/components/ricerca/ricerca-workers-pipeline-view.tsx:2533+`
File child: `src/components/ricerca/worker-pipeline-summary-cards.tsx:528-547`

Stesso schema. `<WorkerPipelineSummaryCards>` viene renderizzato senza `key`:

```tsx
// ricerca-workers-pipeline-view.tsx:2533
<WorkerPipelineSummaryCards
  workerRow={selectedWorkerRow}
  selectionRow={selectedSelectionRow}
  // ...
/>
```

Internamente ha multipli `useState` con valori dipendenti dal worker (addressDraft, familyAddressDraft) e numerosi `useDebouncedSave` (linee 1061-1080+). Esiste un effect di resync gated da `isEditing` (linee 550-572, 574-596) — se l'utente clicca un altro worker mentre `isEditing=true`, lo stato non si resetta e si vede l'indirizzo del worker precedente; un flush successivo lo scrive sul worker nuovo.

**Fix**: aggiungere `key={selectedWorkerRow?.id ?? "__empty__"}` al `<WorkerPipelineSummaryCards>` linea 2533. Cascading effect: tutti i child (`AddressSectionCard`, `ExperienceReferencesCard`, `SkillsCompetenzeCard`, `AvailabilityCalendarCard`, `DocumentsCard`, `JobSearchCard` interni) si re-monteranno via parent. 

### FALSI POSITIVI J (campione)

I 12 wrapper detail già fixati con `key=`:

- `<AssunzioniDetailSheet>` in `assunzioni-board-view.tsx:393`
- `<VariazioniDetailSheet>` in `variazioni-board-view.tsx:1282-1283`
- `<ChiusureDetailSheet>` in `chiusure-board-view.tsx`
- `<RiattivazioniDetailSheet>` in `riattivazioni-board-view.tsx`
- `<ProvaDetailSheet>` in `prove-colloqui-view.tsx`
- `<AssegnazioneDetailSheet>` in `crm-assegnazione-view.tsx`
- `<SupportTicketDetailSheet>` in `support-tickets-view.tsx`
- `<RapportoDetailPanel>` in `rapporti-lavorativi-view.tsx`
- `<CedolinoDetailSheet>` in `rapporto-detail-panel.tsx` + `payroll-overview-view.tsx`
- `<ContributoInpsDetailSheet>` in `rapporto-detail-panel.tsx` + `contributi-inps-view.tsx`
- `<WorkerDetailShell>` in `lavoratori-cerca-view.tsx` + `gate1-view.tsx`
- `<FamigliaProcessoDetailShell>` in `crm-pipeline-famiglie-view.tsx`

Altri detail/panel safe perché stateless o non hanno `useState(buildDraft(prop))`:

- `<AnagraficaRecordSheet>` (`anagrafiche-tables-view.tsx:1055`): solo `useMemo` su `row`, no `useState(buildDraft)`. Switching record aggiorna `fields` via memo. Safe.
- `<ColloquioSheet>` (`prove-colloqui-view.tsx:1326`): valori derivati solo da `event`, no useState locale. Safe.
- `<RecruiterFeedbackSheet>` (`lavoratori-cerca-view.tsx:2435`): completamente stateless. Safe.
- `<SelectionDetailsCard>` (esportato ma non renderizzato): dead code, no impatto.
- `<SchedaColloquioPanel>` (renderizzato in `ricerca-workers-pipeline-view.tsx:2480+` con `key={selectedSelectionRow?.id ?? "__empty__"}`): safe.
- `<RicercaFamilySummaryCard>` (esportato ma non renderizzato): dead code.
- `<WorkerDetailComposite>` (esportato ma non renderizzato): dead code.

---

## Pattern per lint rule futura

### Per Classe H (lookup mismatch)

Regola AST: per ogni `<SelectItem value={X}>` dove `X` accede a `.value` / `.valueKey` di un elemento iterato da `lookupOptions*` o `lookupOptionsByDomain.get(...).map(...)`:

1. Tracciare la chain di chiamate fino al patch (`patch*`, `updateRecord`, `onPatchField`, `onPatchProcess`, ecc.).
2. Se nella chain manca un wrapper di traduzione (`getLookupLabelForSave`, `normalizeLookupDbLabels`, `normalizeLookupPatchLabels`), warning.

Pragmatic regex (FP-friendly):

```js
/<SelectItem\s+[^>]*\bvalue=\{(\w+)\.(value|valueKey)\}/   // tag
```
Combinata con un check sul body della `onValueChange` callback:
- se passa il valore ricevuto direttamente a una funzione il cui nome inizia con `patch`, `onPatch`, `update*`, e non è preceduto da `getLookupLabelForSave(...)` / `normalizeLookupDbLabels(...)`, → warning.
- whitelist: chiamate che vanno a `updateProcessCard` / `updateFamilyCard` (dove `normalizeLookupPatchLabels` agisce).

### Per Classe I (stale closure suppressed)

Già coperta dalla lint rule `react-hooks/exhaustive-deps`. Pattern aggiuntivo per analisi del repo:

```sh
grep -rn "eslint-disable.*exhaustive-deps" src/ --include="*.ts" --include="*.tsx"
```

Per ogni hit, richiedere nel commento adiacente uno dei tag riconosciuti:
- `Identity-pin` (rebuild solo su id change)
- `Unmount-flush` (read latest refs at unmount)
- `Static-lookup-domain` (lookup di domini stabili)
- `Canonical-token` (es. `tablesKey` invece di array)

Se manca tag, warning. Implementabile come ESLint custom rule che verifica i 3 token canonici in un comment adiacente alla suppressione.

### Per Classe J (missing `key=` on detail wrapper)

AST rule: per ogni JSX element con identifier che match pattern `^.*(DetailSheet|DetailPanel|DetailShell|DetailContent|SummaryCards|ProfileHeader)$`:
- richiedere un `key=` prop nello JSX site, o un wrapper esterno con `key=`.
- whitelist: elementi che sono semplicemente "stateless render" (no `useState(buildDraft(...))`, no `useDebouncedSave` interno).

Pragmatic regex per audit (FP-friendly):
```sh
grep -rE '<\w+(DetailSheet|DetailPanel|DetailShell|DetailContent|SummaryCards|ProfileHeader)\b' src/components/ -A1 | grep -v "key="
```

Pair con AST check sul componente referenziato:
- se ha `useState\(.*=>.*build(Draft|Practice|RapportoDraft|VariazioneDetailsDraft)`, allora il render site MUST include `key=`.
- se usa `useDebouncedSave`, allora il render site MUST include `key=` (altrimenti `hasUserEditedRef` resta sticky cross-entity).

---

## Conclusioni operative

1. **CLASSE H**: 0 bug attivi in produzione grazie al safety net `normalizeLookupPatchLabels`. 2 percorsi fragili (uno marker, uno dubbio) che dovrebbero essere resi più espliciti.
2. **CLASSE I**: 0 bug attivi. Tutte le suppressioni sono pattern documentati e legittimi.
3. **CLASSE J**: 2 bug attivi nel pipeline overlay di `ricerca-workers-pipeline-view.tsx`. Fix banale: aggiungere `key={selectedWorkerRow?.id ?? "__empty__"}` a `<WorkerProfileHeader>` (linea 2429) e `<WorkerPipelineSummaryCards>` (linea 2533).
