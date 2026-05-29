# Audit Classe E (useState Mirror) + F (realtimeTick) + G (trackWrite bypass)

Data: 2026-05-28
Scope: `src/components/**/*.tsx`, `src/hooks/use-*.ts`, `src/lib/**`.
Branch di riferimento: `realtime-bug-class-plan` (4 audit precedenti già chiusi:
draft-resync, key-on-detail-wrapper, board-hook-vulnerability, save-bypass-trackwrite).

## Sommario

| Classe                    | File analizzati | BUG confermati | DUBBI | FALSI POSITIVI |
| ------------------------- | --------------- | -------------- | ----- | -------------- |
| E. useState Mirror        | 127             | 2              | 2     | ~80            |
| F. realtimeTick mancante  | 19              | 1              | 4     | ~10            |
| G. trackWrite bypass      | 20              | 1              | 2     | ~60            |

Note metodologiche:
- "Falsi positivi" E: `useState(false|true|null|0|"")`, `useState<Set/Map>()`, UI
  state (open/close, hover, drag), `useState(defaultProp)` con pattern uncontrolled
  React standard (es. `Sidebar.defaultOpen`), `useState(initialFromUrl)` calcolato
  una volta con `useMemo([])`, drafts già protetti da `if (isEditingXxx) return` o
  identity-pin `[record?.id]`.
- "Falsi positivi" F: hook che non hanno detail loader separato, board con
  `selectedCardFromColumns` come dipendenza auto-healing, hook con commento esplicito
  che documenta l'omissione deliberata (es. `use-lavoratori-data.ts:1906-1916`).
- "Falsi positivi" G: chiamate di lettura (`fetchXxx`, `table-query`,
  `*_board`/`*_detail` RPC), `supabase.storage.from("baze-bucket").upload(...)`
  (non scrive su tabella sottoscritta), `supabase.channel/auth/onAuthStateChange`.

I 2 sospetti del prior audit `audit-save-bypass-trackwrite.md` (`runAutomationWebhook`
e `runSmartMatchingForwardPreview` in `anagrafiche-api.ts:1631/1645`) sono ancora
non-tracked: vengono ricontati qui per completezza ma sono già nel piano (vedi
`docs/realtime-bug-class-plan.md`).

---

## Classe E — Bug confermati

### E.1 `src/components/lavoratori/experience-references-card.tsx:785-796` — `EditableReferenceCard` resync draft senza guard

**Severità**: MEDIA. La card è renderizzata dentro `experience-references-card`,
montata sotto il profilo lavoratore in `gate1-view` (board realtime su tabella
`referenze_lavoratori`). `key={reference.id}` sul padre garantisce remount al
cambio di reference, ma una echo realtime sulla STESSA reference (es. salvataggio
di `nome_datore` mentre l'utente sta cliccando una stella) fa cambiare l'identità
dell'oggetto `reference` → `useEffect([reference])` riesegue e sovrascrive
`draft.valutazione`, `draft.referenza_verificata`, `draft.referenza_verificata_da_baze`.

```tsx
const [draft, setDraft] = React.useState(() => ({
  referenza_verificata: reference.referenza_verificata ?? "",
  // ... + valutazione, nome_datore, cognome_datore, telefono_datore,
  //     commento_esperienza, referenza_verificata_da_baze
}));

React.useEffect(() => {
  setDraft({  // ← NO isEditing guard, NO identity-pin via reference.id
    referenza_verificata: reference.referenza_verificata ?? "",
    // ...
  });
}, [reference]);  // ← object identity cambia ad ogni echo realtime
```

I `DebouncedInput` interni hanno la propria guardia, ma il `Select` per
`referenza_verificata` (l. 808-831), le 5 stelle `<button>` per `valutazione`
(l. 902-911), e il `Checkbox` `referenza_verificata_da_baze` NON hanno guardia
interna — un'echo arrivata fra il click utente e il fire di `onPatch` può
riportare il `draft` allo stato server.

**Fix suggerito**: identity-pin su `reference.id` (stesso pattern di
`selection-details-card.tsx:153-163`):

```tsx
React.useEffect(() => {
  setDraft({ /* ... */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [reference.id]);
```

### E.2 `src/components/lavoratori/experience-references-card.tsx:1023-1035` — `EditableExperienceCard` resync draft senza guard

**Severità**: MEDIA. Stesso pattern della E.1 ma per l'esperienza lavorativa:

```tsx
const [draft, setDraft] = React.useState(() => ({
  tipo_lavoro: experience.tipo_lavoro ?? [],
  tipo_rapporto: experience.tipo_rapporto ?? "",
  // ... + 5 altri field
}));

React.useEffect(() => {
  setDraft({ /* tutti i 8 field */ });
}, [experience]);  // ← object identity cambia ad ogni echo realtime
```

La card viene renderizzata SOLO quando `isEditing=true` (l. 1585), quindi il
buco esiste esattamente nella finestra di modifica. Controlli senza guardia
interna: `Select` per `tipo_rapporto` (l. 1062), `ExperienceRoleField` per
`tipo_lavoro`, `Checkbox` per `stato_esperienza_attiva`, `Select` per
`motivazione_fine_rapporto`. Il salvataggio di un Select mentre l'utente sta
selezionando un altro Select scrive un patch, l'echo torna, l'`useEffect`
sovrascrive `draft.tipo_lavoro` (valori multi-select).

**Fix suggerito**: identity-pin su `experience.id`.

---

## Classe E — Dubbi

### E-D.1 `src/components/gestione-contrattuale/rapporto-detail-panel.tsx:849, 862-864` — `processOfferta` mirror

```tsx
const [processOfferta, setProcessOfferta] = React.useState(currentProcesso?.offerta ?? "")
// ...
React.useEffect(() => {
  setProcessOfferta(currentProcesso?.offerta ?? "")
}, [currentProcesso?.offerta])
```

Il valore è usato in un `<Select>` (l. 1376) e committato immediatamente con
`updateRecord` (l. 1381). Race condition possibile: due utenti scelgono valori
diversi nello stesso istante → l'echo del primo sovrascrive il draft del secondo
prima che il suo `updateRecord` parta. Probabilità realistica bassa
(operazione one-shot non in typing), ma asimmetrica rispetto al pattern
identity-pin usato altrove nel file (`buildRapportoDraft` ha guard
`editingSection === null`, l. 682). Sarebbe coerente uniformare.

### E-D.2 `src/components/support/support-ticket-detail-sheet.tsx:140, 144-146` — `selectedRapportoId` mirror

```tsx
const [selectedRapportoId, setSelectedRapportoId] = React.useState(currentRapportoId ?? "")
React.useEffect(() => {
  setSelectedRapportoId(currentRapportoId ?? "")
}, [currentRapportoId, record?.id])
```

Usato in un Combobox prima del bottone "Link". Se l'utente seleziona un
rapporto e nello stesso ms arriva un'echo che cambia `currentRapportoId` lato
parent (es. colleage che linka un altro rapporto), la scelta viene persa.
Pattern: filtro/selettore, non typing — basso impatto.

---

## Classe F — Bug confermati

### F.1 `src/components/ricerca/ricerca-detail-view.tsx:893-1268` — detail view senza realtime

**Severità**: ALTA. Questa view è la pagina dedicata al singolo processo di
ricerca (`/ricerca/:processId`). Carica `processi_matching` + lookup + indirizzi
+ selezioni e li mette in `card` locale. NON usa `useRealtimeBoardSync` né
`useRealtimeRows`. Il `loadDetail` ha solo `[currentProcessId]` come dep
(l. 1268).

Conseguenza: se due recruiter aprono la stessa ricerca, il secondo vede
sempre dati stantii fino a refresh manuale. Stessa famiglia di bug della Class F
del piano (use-rapporti-lavorativi-data ecc.) ma in una pagina di lavoro reale
con drafts (`orariDraft` l. 801, `editingSections` Set l. 798).

**Fix suggerito**: agganciare `useRealtimeBoardSync` con `tables: ["processi_matching",
"selezioni_lavoratori", "indirizzi_famiglie"]` e `reloadOpenDetail: loadDetail`.
Esiste già la struttura: basta avvolgere `loadDetail` in `useCallback` e
passarlo come `reloadOpenDetail`.

---

## Classe F — Dubbi

### F-D.1 Board hooks con detail loader "id-only" — pattern accettato ma rischioso

I seguenti loader detail hanno `// eslint-disable-next-line react-hooks/exhaustive-deps`
+ commento esplicito che documentano l'omissione di `selectedCardFromColumns` /
`realtimeTick`:

- `gestione-contrattuale/assunzioni-board-view.tsx:307-312` — comment "would re-trigger
  fetch loop and freeze the page".
- `gestione-contrattuale/variazioni-board-view.tsx:1196-1198` — "avoid re-fetching detail on every board refresh".
- `gestione-contrattuale/chiusure-board-view.tsx:865-868` — stesso testo.
- `payroll/contributi-inps-view.tsx:765-767` — stesso testo.

Conseguenza: detail panel mostra dati stantii dopo echo da altri utenti finché
l'utente non chiude e riapre il record. Sono CONSAPEVOLI ma compromettono
l'esperienza realtime. Decidere se valga la pena introdurre `detailRefreshTick`
(stesso pattern di `use-payroll-board.ts`) per riallinearli con
`use-crm-pipeline-preview.ts` che invece passa `reloadOpenDetail`.

### F-D.2 `src/hooks/use-rapporti-lavorativi-data.ts:413-416, 491-577` — board senza reloadOpenDetail

Il `useRealtimeBoardSync` qui non passa `reloadOpenDetail`. Il `loadSelectedRapporto`
ha solo `[detailRetryToken, selectedRapportoId]` come dep (l. 577). Già
identificato nel `audit-board-hook-vulnerability.md` come VULNERABLE per ragioni
diverse (board cache sovrascritta da detail). Per Class F: il detail va stantio
su echo da altri utenti. Non c'è commento esplicito qui — discrepanza con la
documentazione del pattern.

---

## Classe G — Bug confermati

### G.1 `src/components/crm/famiglia-processo-detail-content.tsx:706-726` — `duplica-processo-matching` non tracked

**Severità**: BASSA (one-shot user action, non typing). Il bottone "Duplica
ricerca" invoca direttamente `invokeEdgeFunction("duplica-processo-matching", ...)`
senza wrapper `trackWrite` / `runTrackedEdgeFunction`.

```tsx
const response = await invokeEdgeFunction<DuplicaProcessoResponse>(
  "duplica-processo-matching",
  { processo_matching_id: card.id },
)
```

La funzione edge insert un nuovo `processi_matching` row → l'echo realtime
non viene riconosciuto come "nostro" → la board CRM ricarica per nulla
(spreca 1 round-trip al RPC `crm_pipeline_famiglie_board`). Niente loss-of-data
qui, solo lavoro sprecato. La forma del fix è banale: cambia in
`runTrackedEdgeFunction<DuplicaProcessoResponse>("duplica-processo-matching", ...)`.

---

## Classe G — Dubbi / da verificare lato edge function

I prossimi due sono i "secondary concerns" già identificati in
`audit-save-bypass-trackwrite.md` e ancora non chiusi. Li ricontiamo qui solo
per inventario; vanno chiusi seguendo il piano FASE 4 TER.

### G-D.1 `src/lib/anagrafiche-api.ts:1631-1643` — `runAutomationWebhook` non tracked

```ts
export async function runAutomationWebhook(...) {
  const response = await invokeEdgeFunction<RunAutomationWebhookResponse>(
    "run-automation-webhook", { automationId, recordId, context })
  clearReadCaches()
  return response
}
```

Callers: `creazione-annuncio-card.tsx:52`, `payroll-overview-view.tsx:523`.
Se il webhook scrive su una subscribed table, echo un-suppressed.

### G-D.2 `src/lib/anagrafiche-api.ts:1645-1654` — `runSmartMatchingForwardPreview` non tracked

```ts
export async function runSmartMatchingForwardPreview(processId: string) {
  return invokeEdgeFunction<SmartMatchingForwardResponse>("smartmatching-v21", {
    processo_matching_id: processId,
    dry_run: false, /* writes scores/selections */ })
}
```

Caller: `ricerca-workers-pipeline-view.tsx:2152`. Con `dry_run: false` la
funzione persiste righe in `selezioni_lavoratori` (table sottoscritta) →
bypass confermato. Severity media perché il pulsante è cliccato in pieno
flusso recruiter dove tipicamente c'è anche un input attivo accanto.

### G-D.3 `src/lib/ai-generation.ts:14-27` — `invokeAiGenerationFunction` non tracked

```ts
export async function invokeAiGenerationFunction(functionName, payload) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: payload })
  ...
}
```

Le 3 funzioni AI scrivono campi testuali in `lavoratori`/`selezioni_lavoratori`.
Callers: `ricerca-workers-pipeline-view.tsx:1867, 1915`,
`lavoratori-cerca-view.tsx:1188`. Same fix: usare `runTrackedEdgeFunction` o
introdurre una versione `runTrackedSupabaseFunction` parallela (la API è
leggermente diversa: `supabase.functions.invoke` vs `invokeEdgeFunction`).

---

## Pattern per lint rule futura

### Class E — useState mirror

Regola ESLint `no-prop-mirroring-without-pin`:

- AST selector: `VariableDeclarator > CallExpression[callee.name='useState' | callee.property.name='useState']`
  con `arguments[0]` che è (a) `MemberExpression` con root in `Identifier` matchato
  da `^(card|row|record|selectionRow|workerRow|serverRow|reference|experience|defaults|.*Row|.*Card|.*Record)$`,
  oppure (b) un `CallExpression` su funzioni `buildXxxDraft` / `makeXxxDraft`
  / `to(Input|DateTime)Value` con argomento che ha quella root.
- Trigger anche se l'initializer è un arrow `() => ...` con la stessa forma.
- Auto-fix: aggiungere `// allowed: identity-pinned` (suppression) oppure
  segnalare la mancanza di un fratello `React.useEffect(..., [<id>])`.
- Whitelist: `useState<X>(prop)` quando il file matcha `**/ui/sidebar.tsx`,
  `**/ui/carousel.tsx`, `**/ui-gallery.tsx`, e quando il prop si chiama
  `default*` (pattern React uncontrolled).
- Stretch: verificare che il sibling `useEffect` abbia `if (isEditingXxx) return`
  oppure deps `[record?.id]` (no `[record]`).

Regex grossolana per pre-commit (alternativa al lint):

```bash
grep -rEn "useState\([a-z][a-zA-Z]*\?\.|useState\(buildDraft|useState\(\(\) => build" \
  src/components --include='*.tsx' | grep -v "// allowed"
```

### Class F — missing realtimeTick / reloadOpenDetail

Regola ESLint `realtime-board-must-pass-reload-open-detail`:

- AST selector: chiamata a `useRealtimeBoardSync({...})` in cui il file
  contiene anche un `useEffect` con `setSelected*(...)` dentro un async
  fetcher → richiedere che la prop `reloadOpenDetail` sia presente.
- Whitelist via commento `// no-detail-loader` sopra la chiamata.
- Alternative: verificare ogni `loadSelected*` / `fetchXxxDetail` chiamato
  dentro un `useEffect` cui mancano deps `[realtimeTick]` o
  `[selectedCardFromColumns]` (object identity dep, non solo `.id`).

Regex per audit periodico:

```bash
grep -rEn "useRealtimeBoardSync\(" src/hooks src/components --include='*.ts*' \
  | xargs -I{} sh -c 'file=$(echo {} | cut -d: -f1); \
    grep -L "reloadOpenDetail\|// no-detail-loader" "$file"'
```

### Class G — direct edge invocation that should be tracked

Regola ESLint `track-edge-function-writes`:

- AST selector: `CallExpression[callee.name='invokeEdgeFunction'|callee.property.name='invoke']`
  + `arguments[0].value` matcha un'allow-list o, meglio, una BAN-list
  (function names che scrivono: `duplica-*`, `smartmatching-*`, `run-automation-webhook`,
  `generare-*`, `family-availability`, `worker-availability`, qualsiasi
  `*-update`/`*-create`/`*-delete`).
- Errore se non è in un `CallExpression` di `trackWrite` /
  `runTrackedEdgeFunction` né dentro un `mutationFn` di
  `usePatchMutation`/`useMoveMutation`/`useCreateMutation` (questi 3
  wrap automaticamente in trackWrite dopo Fase 4).
- Whitelist `// read-only` per funzioni come `table-query`,
  `lookup-values`, qualsiasi `*_board`/`*_detail`.

Regex per pre-commit:

```bash
grep -rEn "invokeEdgeFunction\(|supabase\.functions\.invoke\(" \
  src --include='*.ts' --include='*.tsx' \
  | grep -vE "runTrackedEdgeFunction|trackWrite|// read-only" \
  | grep -vE "\"table-query\"|\"lookup-values\"|_board\"|_detail\""
```

---

## Files verificati e considerati safe (campione)

Class E:
- `src/components/ricerca/selection-details-card.tsx` — identity-pin `[selectionId]`.
- `src/components/ricerca/scheda-colloquio-panel.tsx` — identity-pin `[selectionId]`.
- `src/components/lavoratori/worker-profile-header.tsx` — `if (isEditing) return`.
- `src/components/crm/cards/onboarding-context-card.tsx` — per-field `dirtyRef` + reset on `card.id` change.
- `src/components/crm/cards/onboarding-decisione-lavoro-card.tsx` — dirty refs su ogni checkbox/select.
- `src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx:566-578, 1194-1202` — identity-pin `[assunzione?.id, card.id, ...]`.
- `src/components/crm/crm-assegnazione-view.tsx:494-512` — `initializedCardIdRef` + `isEditingScheduling` guard.
- `src/components/ricerca/worker-pipeline-summary-cards.tsx:550-596` — `if (isEditing) return`.
- `src/components/lavoratori/gate1-view.tsx:3755-3822` — per-field merge con `lastSyncedGateDraftRef`.
- `src/hooks/use-selected-worker-editor.ts:430-468` — `if (!isEditingXxx)` per ogni section setter.

Class F:
- `src/hooks/use-crm-pipeline-preview.ts:2148-2156` — pattern di riferimento (`reloadOpenDetail` + `openProcessIdRef`).
- `src/hooks/use-payroll-board.ts` + `payroll-overview-view.tsx:1384-1427` — detail effect su `[selectedCardFromColumns]` object dep, self-healing.
- `src/hooks/use-prove-colloqui-data.ts`, `use-riattivazioni-board.ts`, `use-support-tickets-board.ts`, `use-crm-assegnazione.ts` — nessun detail loader separato (board-only).
- `src/hooks/use-lavoratori-data.ts:1906-1916` — omissione `realtimeTick` documentata (rate-limit considerato).

Class G:
- `src/lib/anagrafiche-api.ts:1593-1628` — `updateRecord`/`createRecord`/`deleteRecord` tutte wrapped in `trackWrite`.
- `src/hooks/use-board-mutations.ts:50-57` — wrapper trackWrite difensivo introdotto in Fase 4.
- `src/hooks/use-debounced-save.ts:60, 75, 88` — `beginPendingWrite`/`endPendingWrite` bracket.
- `src/lib/availability-functions.ts:54` — `runTrackedEdgeFunction("worker-availability", ...)`.
- `src/components/ricerca/ricerca-detail-view.tsx:1399` — `runTrackedEdgeFunction("family-availability", ...)`.
- `src/components/crm/cards/onboarding-card.tsx:431` — `runTrackedEdgeFunction("family-availability", ...)`.
- Tutti i `supabase.storage.from("baze-bucket").upload(...)` (6 siti): non scrivono su tabella sottoscritta.
- Tutti i `supabase.rpc(...)` in `lib/anagrafiche-api.ts`: solo letture (`*_board`, `*_detail`, `lavoratore_extras`, `lookup-values`).
