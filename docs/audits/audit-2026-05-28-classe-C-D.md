# Audit Classe C (Fire-and-forget) + Classe D (Draft Resync senza guard)

Data: 2026-05-28
Scope: `src/hooks/` + `src/components/`

## Sommario

| Classe | File analizzati | BUG confermati | DUBBI | FALSI POSITIVI |
|---|---|---|---|---|
| C. Fire-and-forget | ~30 (333 hit `void X(` totali) | ~120+ (raggruppati in 8 file) | 3 | ~205 |
| D. Draft Resync | ~25 useEffect candidati | 2 | 3 | ~20 |

Nota Classe C: le 120+ occorrenze BUG-confermate si concentrano in handler JSX che chiamano `void patchXXX(...)` su funzioni `patch*` che rilanciano l'errore (vedi `applyWorkerPatch` → `throw caughtError` a `use-selected-worker-editor.ts:529`). Raggruppate per pattern strutturale.

---

## Classe C — Bug confermati

### C.1 — `void updateProcessCard(...)` su funzione che rilancia

`updateProcessCard` (`src/components/ricerca/ricerca-detail-view.tsx:1270-1300`) cattura errori internamente e poi fa `throw caughtError;` alla riga 1296. I 4 call site JSX la chiamano con `void` puro senza `.catch`:

- `src/components/ricerca/ricerca-detail-view.tsx:1606`
- `src/components/ricerca/ricerca-detail-view.tsx:1630`
- `src/components/ricerca/ricerca-detail-view.tsx:1696`
- `src/components/ricerca/ricerca-detail-view.tsx:1727`

Snippet (1606):
```tsx
onValueChange={(next) => {
  if (!next || !resolvedCard.id) return;
  void updateProcessCard?.(resolvedCard.id, {
    stato_res: next || null,
  });
}}
```

**Cosa manca**: `.catch` o wrapping in async IIFE con try/catch. `setError` è già chiamato internamente (riga 1291), ma `throw` propaga.

**Effort fix**: 5 min — sostituire con `void saveProcessPatch(...)` (esistente, swallow) oppure aggiungere `.catch(() => {})` esplicito.

---

### C.2 — `void patchSelectedWorkerField`, `void patchWorkerAddressField`, `void patchDocumentField`, `void patchJobSearchField`, `void patchSkillsField`, `void patchExperienceRecord`, `void createExperienceRecord`, `void patchReferenceRecord`, `void createReferenceRecord`, `void patchWorkerAvailabilityStatus`

Tutte queste discendono da `patchWorkerField` → `applyWorkerPatch` (`src/hooks/use-selected-worker-editor.ts:511-536`) che fa `throw caughtError;` a riga 529. Quindi qualsiasi `void` non catturato è unhandled rejection.

**File interessati**:
- `src/components/lavoratori/gate1-view.tsx` — righe 4189, 4224, 4238, 4307, 4315, 4357, 4368, 4397, 4403, 4437, 4462, 4477, 4480, 4483, 4486, 4540, 4573, 4583, 4678, 4688, 4701, 4743, 4753, 4766, 4801, 4811, 4846, 4855, 4972, 4984, 4994, 5004, 5014, 5024, 5034, 5044, 5065, 5077, 5086, 5095, 5104, 5115, 5126, 5139, 5153, 5169, 5185, 5198, 5211, 5224, 5237, 5249, 5265, 5283, 5300, 5317, 5333, 5350, 5366, 5429, 5441, 5451, 5461, 5471, 5481, 5491, 5501, 5553, 5563, 5589, 5642 (≈70 call site)
- `src/components/lavoratori/lavoratori-cerca-view.tsx` — righe 1709, 1715, 1730, 1777, 1788, 1876, 1886, 1896, 1906, 1916, 1926, 1976, 1979, 1985, 1988, 2009, 2055, 2065, 2153, 2190, 2236 (≈21 call site)
- `src/components/ricerca/ricerca-workers-pipeline-view.tsx` — righe 2658, 2686, 2688, 2727, 2737 (≈5 call site)
- `src/components/ricerca/worker-pipeline-summary-cards.tsx` — righe 803, 938, 1134, 1447, 1783, 1827 (≈6 call site)

Snippet rappresentativo (gate1-view.tsx:4189):
```tsx
setGateDraft((current) => ({
  ...current,
  referenteCertificazione: value ?? "",
}));
void patchSelectedWorkerField(
  "referente_certificazione_id",
  value,
);
```

**Cosa manca**: `.catch` o try/catch wrapper. Lo state error (`setError`) viene già settato dentro `applyWorkerPatch` ma il rejection è non gestito.

**Effort fix**: 30 min — pattern globale. Soluzione consigliata: aggiungere un metodo `safeAsync` o un piccolo wrapper `void patchXxx(...).catch(() => {/* surfaced via setError */})`, oppure introdurre `tryPatch` in `useSelectedWorkerEditor` che cattura ed espone solo lo stato. Una sola modifica nel hook editor (rimuovere il `throw caughtError` da `applyWorkerPatch`/`applyAddressPatch`/`patchExperienceRecord`/`patchReferenceRecord`/`patchWorkerAvailabilityStatus`) elimina la classe.

---

### C.3 — `void updateRecord(...)` diretto in JSX

`updateRecord` (`src/lib/anagrafiche-api.ts:1590`) propaga errori network/server.

- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1381` (Select offerta processi_matching)
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1806` (Sheet onStageChange mesi_lavorati)
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1811` (Sheet onPatchCard mesi_lavorati)
- `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:1814` (Sheet onPatchPresence presenze_mensili)

Snippet (1381):
```tsx
onValueChange={(value) => {
  setProcessOfferta(value)
  if (!currentProcesso?.id) return
  void updateRecord("processi_matching", currentProcesso.id, {
    offerta: value || null,
  })
}}
```

**Cosa manca**: `.catch` + toast. Nessun rollback dello stato locale se il save fallisce.

**Effort fix**: 5–10 min per call site. Wrappare in async handler con try/catch e toast.error.

---

### C.4 — `void moveCard(...)` / `void patchCard(...)` in JSX board view

Tutti i `moveCard`/`patchCard` esposti dagli hook `useXxxBoard` chiamano `mutation.mutateAsync(...)` senza try/catch e propagano. La `useMoveMutation`/`usePatchMutation` (`src/hooks/use-board-mutations.ts:70-74`) esegue rollback ottimistico in `onError`, ma rilancia comunque.

Eccezioni guardate (false positive):
- `use-ricerca-workers-pipeline.ts:1099-1108` — `moveCard` ha `try/catch + toast.error`. ⇒ FP.
- `use-crm-assegnazione.ts:570-579` — `assignCardToDate` NON cattura ⇒ BUG (vedi sotto).

**File call site BUG**:
- `src/components/ricerca/ricerca-board-view.tsx:317` (`void moveCard`)
- `src/components/crm/crm-pipeline-famiglie-view.tsx:615` (`void moveCard`)
- `src/components/crm/crm-assegnazione-view.tsx:1110` (`void assignCardToDate(processId, targetDate)` — `assignCardToDate` non cattura)
- `src/components/gestione-contrattuale/assunzioni-board-view.tsx:379` (`void moveCard`)
- `src/components/gestione-contrattuale/variazioni-board-view.tsx:1274` (`void moveCard`)
- `src/components/gestione-contrattuale/riattivazioni-board-view.tsx:683` (`void moveCard`)
- `src/components/gestione-contrattuale/chiusure-board-view.tsx:945` (`void moveCard`)
- `src/components/payroll/contributi-inps-view.tsx:912` (`void moveCard`)
- `src/components/payroll/payroll-overview-view.tsx:1539, 1561, 1564` (`void moveCard`/`void patchCard`)

**Cosa manca**: né toast utente né `.catch`. L'utente vede solo il "salto" visivo del rollback ottimistico (snapshot ripristinato in `onError`) senza spiegazione.

**Effort fix**: 15 min — uniformare pattern usando il già implementato `use-ricerca-workers-pipeline.ts:1094-1110` come modello (toast.error nel hook stesso). Una modifica centralizzata in `useBoardMutation` per aggiungere un default `toast.error` su `onError` risolve la classe.

---

### C.5 — `void persistContrattoChangesRef.current()` senza .catch su funzione senza catch

`src/components/gestione-contrattuale/rapporto-detail-panel.tsx:944, 962`:

```tsx
autosaveTimeoutRef.current = window.setTimeout(() => {
  autosaveTimeoutRef.current = null
  void persistContrattoChangesRef.current().finally(() => endPendingWrite())
}, 500)
```

`persistContrattoChanges` (riga 904-922) ha solo `try { ... } finally { setSavingContratto(false) }`. NESSUN catch. Se `updateRecord` fallisce: l'errore propaga, lo state locale resta ottimisticamente aggiornato (riga 911 `setRapportoState(... patch)`) e non viene rollback-ato. L'utente vede il valore "salvato" ma in DB c'è ancora il vecchio.

**Cosa manca**:
1. `try/catch` dentro `persistContrattoChanges` con rollback dello state e toast.
2. `.catch` sui call site `void persistContrattoChangesRef.current()` al netto.

**Effort fix**: 15 min — aggiungere `catch (caughtError) { setRapportoState(previousSnapshot); toast.error(...) }`.

**Impatto**: ALTO. L'autosave del contratto può silenziosamente non salvare.

---

## Classe C — Dubbi

### C.D1 — `void Promise.resolve(reloadRef.current()).then(...)` senza catch sul `reloadDetail`

`src/hooks/use-realtime-board-sync.ts:73-76`:
```ts
void Promise.resolve(reloadRef.current()).then(() => {
  const reloadDetail = reloadOpenDetailRef.current
  if (reloadDetail) void reloadDetail()
})
```

`reloadRef.current()` è tipicamente `invalidateBoard` (no-throw). `reloadDetail` arriva dall'esterno; non si sa se può rilanciare. Dubbio basso, ma non c'è `.catch` esterno.

**Effort fix**: 2 min — aggiungere `.catch(() => {})`.

### C.D2 — `void invokeFamilyAvailability(false)` in unmount

`src/components/crm/cards/onboarding-card.tsx:466`:
```ts
return () => {
  if (familyAvailabilityTimerRef.current) {
    clearTimeout(...);
    void invokeFamilyAvailability(false);
  }
};
```

Pattern flush-on-unmount come `use-debounced-save.ts:58`. Stessa categoria del noto esempio dato.

### C.D3 — `void updateRecord(...)` come callback `onPatchCard` / `onStageChange` in `MeseDetailSheet`

Le call site 1806/1811/1814 in `rapporto-detail-panel.tsx` sono passate come prop a un `MeseDetailSheet`. Se il consumer fa già wrap su quei callback (toast etc.) sarebbe FP, ma a livello di handler JSX qui non c'è gestione.

---

## Classe D — Bug confermati

### D.1 — `EditableReferenceCard` resync senza guard

`src/components/lavoratori/experience-references-card.tsx:785-796`:
```tsx
React.useEffect(() => {
  setDraft({
    referenza_verificata: reference.referenza_verificata ?? "",
    nome_datore: reference.nome_datore ?? "",
    ...
    valutazione: reference.valutazione ?? 0,
    ...
  });
}, [reference]);
```

**Cosa manca**: nessun `isEditing*` guard, nessun `dirtyRef`. La dep `[reference]` è l'intero record: ogni realtime echo su QUALSIASI campo del record rebuilda l'intero draft.

**Impatto**: i campi non protetti da `DebouncedInput` (Select `referenza_verificata` riga 808-832, star rating `valutazione` riga 900-911) vengono sovrascritti durante l'edit. Se l'utente clicca una stella mentre arriva un echo su un altro campo del record, la stella selezionata torna indietro.

**Effort fix**: 15 min — ID-pin pattern: `}, [reference.id])` + commento `// eslint-disable-next-line react-hooks/exhaustive-deps`. Allineato a `selection-details-card.tsx:160-163` (già fixato).

### D.2 — `EditableExperienceCard` resync senza guard

`src/components/lavoratori/experience-references-card.tsx:1023-1036`:
```tsx
React.useEffect(() => {
  setDraft({
    tipo_lavoro: experience.tipo_lavoro ?? [],
    tipo_rapporto: experience.tipo_rapporto ?? "",
    data_inizio: experience.data_inizio ?? "",
    data_fine: experience.data_fine ?? "",
    stato_esperienza_attiva: experience.stato_esperienza_attiva ?? false,
    ...
  });
}, [experience]);
```

Identico pattern a D.1. Dep `[experience]` invece di `[experience.id]`. Campi non-debounced (`tipo_rapporto` Select, `stato_esperienza_attiva` Toggle, `tipo_lavoro` multiselect, date inputs) vengono sovrascritti.

**Effort fix**: 15 min — ID-pin a `[experience.id]`.

---

## Classe D — Dubbi

### D.D1 — `ricerca-workers-pipeline-view.tsx:1769-1788` `setFamilyAddressDraft` senza guard

```tsx
React.useEffect(() => {
  setFamilyAddressDraft({ ... });
}, [card.indirizzoProvaProvincia, ..., card.indirizzoProvaVia]);
```

Nessun guard `isEditing*`. Il draft del PARENT viene sovrascritto a ogni echo. Tuttavia: il child `WorkerPipelineSummaryCards` (riga 550/574) ha il proprio draft interno con guard `isEditing`. L'utente edita nel draft interno, quel commit chiama `patchSelectedProcessAddressField` (riga 2008-2055) che a sua volta aggiorna `setFamilyAddressDraft` ottimisticamente (riga 2026).

Race possibile: echo realtime arriva BEFORE optimistic patch lands → draft parent oscilla. Dato che il child draft ha `isEditing` guard, l'input dell'utente è protetto, ma il display tra parent-card e detail-pane può flickerare.

**Effort fix**: 20 min — aggiungere guard `if (updatingFamilyAddress) return;` o ID-pin se i campi sono read-only mirror.

### D.D2 — `crm-assegnazione-view.tsx:494-512` `setSchedulingDraft` con guard parziale

```tsx
React.useEffect(() => {
  const currentCardId = card?.id ?? null;
  if (initializedCardIdRef.current === currentCardId) {
    if (!isEditingScheduling) {
      setSchedulingDraft(buildSchedulingDraft(card));
    } else {
      setSchedulingDraft((current) => ({
        ...current,
        recruiterId: card?.recruiterId ?? "",  // ← OVERWRITES while editing
      }));
    }
    return;
  }
  ...
}, [card, isEditingScheduling]);
```

Durante l'edit, solo `recruiterId` viene sovrascritto. Se l'utente sta cambiando il recruiter via Select e arriva un echo prima che il save sia confermato, `recruiterId` può tornare al vecchio valore.

**Effort fix**: 10 min — aggiungere guard anche su `recruiterId` (es: `dirtyRecruiterRef`).

### D.D3 — `contributi-inps-view.tsx:238-243` `setStageValue` senza guard

```tsx
React.useEffect(() => {
  setStageValue(card?.stage ?? "")
  ...
}, [card?.id, card?.stage])
```

Classic race: user picks A → `setStageValue(A)` + `onPatchCard` → echo arriva con vecchio `card.stage` → effect resetta `stageValue` allo stale. Su rete lenta, doppio click rapido può perdere il secondo input.

**Effort fix**: 10 min — track `pendingStageRef`, ignorare resync mentre pending.

---

## Pattern per lint rule futura

### Classe C — Fire-and-forget rejection

**AST selector (TS-ESTree)**:
```js
UnaryExpression[operator='void'][argument.type='CallExpression']
  // no parent .catch / try-catch / Promise.* chain
```

Approccio: nuovo eslint rule `no-unhandled-void-promise` che:
1. Identifica `void X(...)` dove `X(...)` returna `Promise<*>` (type-aware).
2. Scarta se l'espressione è seguita da `.catch(...)` o `.then(_, onRejected)` o è dentro `try { ... }` o è il return di `.finally(...)`.
3. Scarta se la funzione chiamata è in una allowlist (es. `queryClient.invalidateQueries`, `refetch`, `mutation.mutateAsync` usate con `mutation.onError` configurato).
4. Per JSX handlers (`onValueChange`, `onChange`, `onClick`), il rule è strict.

Regex temporanea per audit periodico:
```
^\s*void [a-zA-Z_$][\w$.?]*\([^)]*\)(?!\s*[.;])
```
Falso-positivo basso ma matcha solo riga singola; integrare con `rg --multiline`.

### Classe D — Draft resync senza guard

**AST selector (TS-ESTree)**:
```js
CallExpression[
  callee.type='MemberExpression'
  callee.object.name='React'
  callee.property.name='useEffect'
]
  > ArrowFunctionExpression
    > BlockStatement
      > ExpressionStatement
        > CallExpression[
          callee.name=/^set[A-Z]\w*Draft$/
        ]
  // no preceding `IfStatement` with test referencing /^isEditing[A-Z]?\w*$/
  // or `dirty\w+Ref\.current`
```

Approccio: nuovo eslint rule `require-draft-resync-guard`:
1. Identifica `useEffect(() => { setXxxDraft(...) ... }, [deps])`.
2. Verifica presenza di:
   - Guard `if (isEditing*) return;` PRIMA di `setXxxDraft`, OPPURE
   - Guard `if (dirty*Ref.current) return;`, OPPURE
   - Dep array che NON contiene il record completo (solo `record.id` ID-pin).
3. Whitelist: useEffect con dep singola `[xxxId]` (ID-pin pattern).
4. Configurabile per ignorare componenti che usano solo `DebouncedInput` (commento eslint-disable per documentare).

Regex/grep temporanea per audit:
```bash
# Trova set*Draft in useEffect e mostra 5 righe prima per il guard.
grep -rn -B5 "set[A-Z][a-zA-Z]*Draft(" src/hooks/use-*.ts src/components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -E "React\.useEffect|isEditing|dirty.*Ref|set[A-Z][a-zA-Z]*Draft"
```

---

## File analizzati (campione rappresentativo)

Hook custom esaminati (28 file `src/hooks/use-*.ts`):
- `use-debounced-save.ts`, `use-selected-worker-editor.ts`, `use-rapporti-lavorativi-data.ts`,
  `use-lavoratori-data.ts`, `use-anagrafiche-data.ts`, `use-rapporto-related-data.ts`,
  `use-realtime-board-sync.ts`, `use-board-mutations.ts`, `use-ricerca-workers-pipeline.ts`,
  `use-ricerca-board.ts`, `use-assunzioni-board.ts`, `use-chiusure-board.ts`,
  `use-riattivazioni-board.ts`, `use-variazioni-board.ts`, `use-payroll-board.ts`,
  `use-contributi-inps-board.ts`, `use-crm-assegnazione.ts`, `use-crm-pipeline-preview.ts`,
  `use-prove-colloqui-data.ts`, `use-operatori-options.ts`, `use-auth-session.ts`,
  `use-realtime-rows.ts`, `use-support-tickets-board.ts`, `use-table-query-state.ts`, ...

Pannelli detail / view esaminati:
- `ricerca-detail-view.tsx`, `ricerca-workers-pipeline-view.tsx`, `worker-pipeline-summary-cards.tsx`,
  `selection-details-card.tsx`, `scheda-colloquio-panel.tsx`, `ricerca-board-view.tsx`,
  `ricerca-workers-map-view.tsx`, `crm-assegnazione-view.tsx`, `crm-pipeline-famiglie-view.tsx`,
  `famiglia-processo-detail-content.tsx`, `gate1-view.tsx`, `lavoratori-cerca-view.tsx`,
  `worker-profile-header.tsx`, `experience-references-card.tsx`, `assunzioni-detail-sheet.tsx`,
  `rapporto-detail-panel.tsx`, `variazioni-board-view.tsx`, `chiusure-board-view.tsx`,
  `riattivazioni-board-view.tsx`, `contributi-inps-view.tsx`, `payroll-overview-view.tsx`,
  `prove-colloqui-view.tsx`, `support-ticket-detail-sheet.tsx`, `anagrafiche-tables-view.tsx`,
  cards CRM (`onboarding-card.tsx`, `onboarding-decisione-lavoro-card.tsx`,
  `onboarding-context-card.tsx`, `stato-lead-card.tsx`).

Esempi noti esclusi dal conteggio (come da brief):
- `use-debounced-save.ts:58, 86` (BUG di riferimento già documentato)
- `use-selected-worker-editor.ts:442-456` (Classe D già fixato)
