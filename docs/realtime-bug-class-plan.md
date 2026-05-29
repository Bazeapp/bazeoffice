# Piano: chiusura definitiva della classe di bug "realtime / draft / concorrenza"

> Branch dedicato: `realtime-bug-class-plan`.
> Su `main` continuano gli sviluppi normali; questo branch lavora in parallelo
> e viene mergeato a tappe (una FASE alla volta) o cherry-pick selettivo.
>
> **Update 2026-05-28**: piano integrato con i fix proposti dall'audit
> esterno (`SINTESI_AUDIT_BAZEOFFICE.md`) dopo l'analisi condotta in
> `docs/audit-response.md`. Aggiunte FASE 4 TER (toast + fix oggi),
> FASE 5 BIS (Field Editor pattern), FASE 6 BIS (realtime hardening).

## Obiettivo finale

**Nessun operatore segnala mai più un bug del tipo:**
- "ho scritto e si è cancellato"
- "ho salvato sul profilo sbagliato"
- "il dato non è andato sul DB"
- "vedo dati vecchi"
- "i campi spariscono dalla scheda"

E ogni regression di questa classe viene **bloccata da un test** prima del push.

## Principi guida (non negoziabili)

1. **Server state e form state SONO COSE DIVERSE.** Server state in React
   Query. Form state in form refs (react-hook-form). Mai mescolati.
2. **Ogni fix porta con sé il test che lo prova.** Nessuna eccezione.
3. **Procediamo a strati.** Prima fix-bug, poi prevenzione strutturale,
   poi soluzione architetturale. Niente salti.
4. **Niente refactor speculativi.** Solo cose con un bug reale o un test
   che le motiva.

---

## FASE 0 — Chiusura del presente ✅

Già fatta su `main` (commit `03ecdd3`).

- [x] Vitest setup + 55 unit test
- [x] Fix `feeConcordata` (RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS)
- [x] Fix `availabilityDraft` + 7 altri draft (guardia `isEditing*`)
- [x] Push su main

## FASE 1 — Setup infrastruttura test componente/hook ✅

**Stima**: ~3h. **Branch**: `realtime-bug-class-plan`.

- [x] Installate `@testing-library/react`, `@testing-library/user-event`,
      `happy-dom`, `@testing-library/jest-dom` (happy-dom invece di jsdom:
      jsdom 29 ha una regressione ESM su node 22).
- [x] `vitest.config.ts` con `environment: "happy-dom"` e `setupFiles`.
- [x] `src/test/setup.ts` con: jest-dom matchers, cleanup automatico,
      polyfill `matchMedia` / `ResizeObserver` / `IntersectionObserver`.
- [x] `src/test/test-utils.tsx`: helper `renderHookWithQueryClient` e
      `renderWithProviders` con QueryClient isolato per test.
- [x] `src/test/smoke.integration.test.tsx`: 3 smoke test green.
- [x] Script: `test`, `test:watch`, `test:unit`, `test:integration`.
- [x] Lefthook installato + `pre-push` con `npm test`, typecheck, lint.
- [x] Exclude `supabase/functions` dalla lint (Deno tooling separato).

**Done**: 58 test verdi in ~1s. Helper pronti in `@/test/test-utils`.

## FASE 2 — Test di regressione sui bug visti ✅

**Stima**: ~1 giorno. **Effettivi**: ~30min con 3 agent in parallelo.

- [x] Regressione `feeConcordata` (unit test su binding) — FASE 0
- [x] Regressione preservazione campi CRM (`preserveMissingFields`) — FASE 0
- [x] Regressione `availabilityDraft` + headerDraft + addressDraft +
      jobSearchDraft: hook test su `useSelectedWorkerEditor` — 5 test
      in `use-selected-worker-editor.integration.test.tsx`
- [x] Regressione `key=` mancante: pattern test in
      `key-unmount-pattern.integration.test.tsx` — 4 test che provano
      perché serve `key={selectedId ?? "__empty__"}` sui wrapper detail
- [x] Regressione echo-suppression (LOCAL_WRITE_ECHO_WINDOW_MS) — hook
      test in `use-realtime-board-sync.integration.test.tsx`
- [x] Regressione pending-write defer — stesso file
- [x] Regressione debounce burst + ordine reload→reloadOpenDetail —
      stesso file

**Totale**: 14 nuovi test integration + 55 pure function = 72 test verdi
in ~1.7s.

**Done**: i bug noti hanno ognuno il proprio test di regressione. Se
qualcuno spezza la guardia `isEditing*`, l'echo-window, il defer dei
pending writes, o il pattern `key=` → `npm test` fallisce prima del push.

## FASE 3 — Audit e fix preventivi ✅

**Stima**: 3-5 giorni. **Effettivi**: ~3h con 9 agent in parallelo (4 audit + 5 fix Wave 1 + 4 fix Wave 2).

- [x] Audit "draft sovrascritto" — 7 TRUE POSITIVE + 1 NOTE in
      `docs/audits/audit-draft-resync.md`. Tutti fixati nelle 2 Wave.
- [x] Audit "key= mancante" — 1 TRUE POSITIVE
      (`SchedaColloquioPanel`), fixato + lint rule widened.
- [x] Audit "Pattern A mancante" — 4 board hooks vulnerabili
      (rapporti, chiusure, assunzioni, variazioni). Pattern A applicato
      a tutti e 4 con binding lists + getPreviousCard lazy.
- [x] Audit "save bypass trackWrite" — 3 BYPASS + central wrapper.
      Tutto coperto: `runTracked`/`runTrackedEdgeFunction` esposti,
      `availability-functions.ts` 1-line covering 4 callers,
      `useBoardMutation` wraps mutationFn defensively.

**Done**: 137 test verdi, classe di bug "fields disappear" + "draft
overwritten" + "save bypass" chiusa retroattivamente.

## FASE 4 — Lint rules e guardrail strutturali ✅

**Stima**: 1-2 giorni. **Effettivi**: 1 commit `eslint.config.js`.

- [x] Lint rule "draft setter without isEditing guard"
      (selector: `setXxxDraft()` come ExpressionStatement diretta in
      un useEffect body).
- [x] Lint rule "useState mirror from prop without sync"
      (selector: `useState(...)` initializer che legge da
      `card / *Row / serverRow / defaults`).
- [x] Lint rule "useEffect che chiama setDraft con deps che includono
      il row" — versione più precisa della prima.
- [x] Refinement della rule esistente "realtimeTick missing":
      ora matcha anche `React.useEffect(...)` namespaced.
- [ ] CI pipeline che blocca PR se lint/test/build falliscono.
      (Lefthook pre-push già attivo localmente; CI server è da
      pianificare separatamente — non bloccante.)

**Done**: 88 warnings sul codebase corrente (tutti pre-existing debt
della stessa classe di bug). 0 errors. Ogni rule ha un recipe di
suppression in-comment con istruzioni esplicite. Nuovi PR non
possono introdurre regression senza override scritto + spiegazione.

## FASE 4 TER — Quick wins: visibility errori + fix segnalazioni aperte

**Obiettivo**: smettere di avere bug invisibili. Da qui in poi, ogni save
che fallisce server-side mostra un toast rosso visibile su qualunque
pagina; ogni handler che dimentica il save viene eseguito e segnalato.

**Razionale** (post audit-response 2026-05-28): l'audit esterno propone
toast come fix di livello P0. Confermato sul codice: 0 board hook su 8
gestisce errori con `toast.error`, e `useDebouncedSave` (133 punti)
è fire-and-forget. Senza visibility non si può misurare se gli altri
fix funzionano in produzione — è precondizione di tutto il resto.

`sonner` è già installato e usato in 21 file; nessuna dipendenza nuova.

**Stima**: 1 giorno.

### 4 TER.1 — Fix immediato `disponibilita_nel_giorno` (5 min)

- [ ] In `gate1-view.tsx:4547` e `:4775`, aggiungere
      `void patchSelectedWorkerField("disponibilita_nel_giorno", values.length > 0 ? values : null)`
      dopo `setAvailabilityDraft(...)`. Allineato ai 2 handler fratelli
      del pannello (`tipo_rapporto_lavorativo`, `check_lavori_accettabili`).
- [ ] Test componente che verifica `updateRecord` viene chiamato dopo
      `onDisponibilitaNelGiornoChange`.

### 4 TER.2 — `toast.error` nei wrapper mutations (30 min)

- [ ] `use-board-mutations.ts:60-64`: aggiungere `toast.error(message)`
      nell'`onError` (con opzione `errorMessage?: string` in
      `BoardMutationOptions` per personalizzare).
- [ ] Propaga automaticamente ai 13 board hook che usano i wrapper.

### 4 TER.3 — `.catch(toast.error)` su `useDebouncedSave` (15 min)

- [ ] `use-debounced-save.ts:58` e `:86`: catturare la promise rejected
      e mostrare toast con il messaggio dell'errore.
- [ ] Propaga ai 17 file consumatori.

### 4 TER.4 — `toast.error` nei catch hand-rolled (1 h)

- [ ] `use-selected-worker-editor.ts:532, 645, 750+`: ogni `setError(...)`
      è accompagnato da `toast.error(message)`. Sostituisce il banner
      `<p>{error}</p>` di gate1-view che non è visibile mentre l'utente
      edita il pannello detail.
- [ ] `use-crm-pipeline-preview.ts:1655, 1957`: idem nei 2 catch hand-rolled.

### 4 TER.5 — Verifica copertura + manuale (1 h)

- [ ] `grep -rL "sonner" src/hooks/use-*-board.ts` deve essere vuoto.
- [ ] Test manuale su 5 board cardine: cedolini, gate1, ricerca,
      chiusure, CRM. Verificare che un errore simulato (es. RLS,
      timeout) produce un toast.

**Done**: classe "save fallisce silenziosamente" chiusa. Le segnalazioni
"non si salva" che continueranno ad arrivare avranno screenshot del
toast con la causa server — informa i fix successivi delle FASE 5 BIS
e 6 BIS.

## FASE 4 QUATER — Audit completo classi di bug "non si salva / non aggiorna" ✅

**Obiettivo**: invece di aspettare le segnalazioni una per una, fare un
audit proattivo del codebase per **10 classi note** di bug, identificare
tutti i punti potenzialmente affetti, e generare il backlog di fix +
lint rule + test prima di partire con la migrazione.

**Razionale**: il caso `disponibilita_nel_giorno` (FASE 4 TER.1) è
emerso da una segnalazione utente. Il survey grep di 5 minuti ha
trovato **13 sospetti analoghi** in 5 file. Il survey completo di
tutte le 10 classi potrebbe far emergere 100+ sospetti — è meglio
saperlo prima di iniziare i fix per ordinare il lavoro per priorità.

**Stima**: 1-2 giorni (4 agent in parallelo + triage).

### Le 10 classi di bug auditate

| # | Classe | Pattern di ricerca |
|---|---|---|
| A | **Save Bypass** | `on*Change` con `setDraft` ma senza `patch/save/update` |
| B | **Silent Error** | `catch` con `setError` ma senza `toast.error` |
| C | **Fire-and-forget Promise** | `void asyncFn(...)` senza `.catch` esterno |
| D | **Draft Resync sin guard** | `useEffect` che resetta draft senza `isEditing*` |
| E | **useState Mirror** | `useState(...)` initializer che legge da prop senza sync |
| F | **Missing realtimeTick** | Effect che dovrebbe risync ma manca dep |
| G | **Save Bypass trackWrite** | `supabase.from(...).update/insert` senza `trackWrite` |
| H | **Lookup mismatch** | Send `value_label` dove DB attende `value_key` o viceversa |
| I | **Stale closure** | `useCallback`/`useMemo` con deps incomplete + suppressed |
| J | **Missing `key=`** | Wrapper detail senza `key={selectedId}` per re-mount |

### 4 QUATER.1 — Esecuzione audit (4 agent in parallelo, ~1 g)

- [ ] Agent 1 audit classi A+B → `docs/audits/audit-2026-05-28-classe-A-B.md`
- [ ] Agent 2 audit classi C+D → `docs/audits/audit-2026-05-28-classe-C-D.md`
- [ ] Agent 3 audit classi E+F+G → `docs/audits/audit-2026-05-28-classe-E-F-G.md`
- [ ] Agent 4 audit classi H+I+J → `docs/audits/audit-2026-05-28-classe-H-I-J.md`

### 4 QUATER.2 — Aggregazione + triage (~3 h)

- [ ] Documento aggregato `docs/audits/audit-2026-05-28-completo.md`
- [ ] Triage: per ogni hit, classificare BUG / FALSO POSITIVO / DUBBIO
- [ ] Ranking per priorità (file ad alto traffico utente prima)

### 4 QUATER.3 — Backlog fix + lint rule + test (~4 h)

- [ ] Lista dei BUG confermati con effort fix
- [ ] Lista dei pattern lint per ogni classe (selettori AST/regex)
- [ ] Lista dei test smoke da scrivere (1 per classe come minimo)

**Done**: roadmap precisa dei fix da fare nelle FASI 4 TER, 5 BIS, 6 BIS.
Numeri reali (non stime). Backlog ordinato per impatto.

**Risultati effettivi (2026-05-28)**:
- ~136 bug confermati, ~17 dubbi
- 4 critici (J.1/J.2 key=, C.5 autosave contratto, C.2 throw promise,
  F.1 realtime ricerca-detail)
- ~117 derivano da 4 fix centralizzati (vedi C in audit aggregato)
- Effort totale per chiusura: 8-12 ore
- Output: `docs/audits/audit-2026-05-28-completo.md` + 4 report dettagliati

## FASE 4 BIS — Eliminate `table-query` outside `/anagrafiche`

**Obiettivo**: nel Network tab di qualunque pagina diversa da
`/anagrafiche` non deve più comparire `table-query`. Ogni
chiamata viene sostituita con una RPC dedicata `*_v1`.

**Stima**: 5-7 giorni con agent in parallelo.

### 4 BIS.1 — Census ✅

- [x] Audit completo dei call site. Output:
      `docs/audits/audit-table-query-callers.md`.
      57 call site outside-anagrafiche, 17 RPC candidate, top 3
      prioritari identificati.

### 4 BIS.2 — Design RPC schema (1 giorno)

- [ ] Per ogni RPC nuova: nome (`<entita>_<scopo>_v1`),
      params, returns. Documento condiviso.

### 4 BIS.3 — Migration SQL + tipi (1-2 giorni)

- [ ] Una migration sola che crea tutte le RPC.
- [ ] Regenerate tipi TS via `mcp__supabase__generate_typescript_types`.
- [ ] Unit test sui mapping.

### 4 BIS.4 — Rewrite FE callers (2-3 giorni, parallelizzabile)

- [ ] Per ogni wrapper table-query-based, sostituire chiamate con la
      RPC. Una agent per file/hook, parallelo.

### 4 BIS.5 — Cleanup + lint rule (mezza giornata)

- [ ] Rimuovere wrapper table-query da `anagrafiche-api.ts` (o
      restringerli a uso interno della pagina anagrafiche).
- [ ] Lint rule `no-restricted-imports` di quelle funzioni da
      fuori `src/components/anagrafiche/**` e
      `src/hooks/use-anagrafiche-*`.

**Done**: 0 chiamate `table-query` nel Network tab fuori dalla
pagina `/anagrafiche`.

## FASE 5 BIS — Form Field Context (react-hook-form + shadcn Form + wrapper autosave)

**Obiettivo**: rendere strutturalmente impossibile il pattern "handler
dimentica il save" + smettere di reinventare primitives (validation,
type-safety, accessibility) che la community ha già risolto.

**Razionale** (post audit-response 2026-05-28 + audit FASE 4 QUATER +
confronto con dev esterno):
- Il bug `disponibilita_nel_giorno` è la firma di una classe più ampia:
  l'audit ha trovato 2 BUG di Classe A e ~117 di Classe C in 200+ handler
  hand-rolled. Ogni handler è occasione per sbagliare.
- Toast (FASE 4 TER) rende visibili gli errori, ma non previene questa
  classe — il save semplicemente non parte.
- Solo un'astrazione (Field component context-aware) elimina la classe
  per costruzione.

### Scelta tecnologica: react-hook-form + shadcn Form + zod + wrapper custom

Best practice industria 2024-2026 per dashboard React (Vercel, Linear,
Cal.com, ecc). Vince su `useFieldEditor` puro perché:

- **Type-safe end-to-end** con `zod` schema come source of truth
- **Performance**: subscriptions per campo, no re-render full form
- **Pattern compound components** già rodato:
  `Form > FormField > FormItem > FormControl > Input/Select`
- **Accessibility integrata** (label associations, aria, error)
- **Ecosistema enorme**: docs, esempi, supporto community
- **Onboarding nuovi dev**: standard riconoscibile

**Caveat**: react-hook-form di base è "save-on-submit", bazeoffice è
"autosave on change". Soluzione: **thin wrapper custom**
(`useAutoSaveFormFields`) che aggiunge il pezzo specifico (debounce
per-tipo, retry, `.catch(toast.error)`, sticky-draft anti-overwrite).

### Debounce per tipo componente

Non c'è un valore unico standard. L'astrazione gestisce internamente:

| Tipo input | Debounce |
|---|---|
| Text / number | 300-500 ms |
| Textarea | 500-700 ms |
| Select / MultiSelect | 0 ms (selezione = intent finale) |
| Checkbox / Radio | 0 ms |
| DatePicker | 0 ms (chiusura picker = intent) |
| File upload | immediato + dirty-tracking |

I Field components (`FieldInput`, `FieldSelect`, ecc) settano il debounce
appropriato; il caller non deve pensarci.

### Field components context-aware

Pattern target:
```tsx
<Form {...form}>
  <FieldMultiSelect name="disponibilita_nel_giorno" />
  <FieldMultiSelect name="tipo_rapporto_lavorativo" />
  <FieldInput name="email" />
</Form>
```

L'utente non passa `value`/`onChange`. Il Field component legge il
context (`useFormContext` di react-hook-form) e si auto-aggancia.
Impossibile dimenticare il save.

**Stima**: 3-4 settimane (setup + pilot + roll-out progressivo).

### 5 BIS.0 — Setup tecnologico (2-3 g)

- [ ] `npm install react-hook-form @hookform/resolvers zod`
- [ ] Aggiungere `Form` components shadcn in
      `src/components/ui/form.tsx` (versione ufficiale shadcn —
      pronta out-of-the-box).
- [ ] Definire 1 zod schema pilota per `WorkerRecord` (campi del
      pannello detail Gate1).
- [ ] Helper `useAutoSaveFormFields(form, options)`:
  - subscriba i campi via `useWatch`
  - debounce per tipo componente
  - chiamata `patchWorker(workerId, patch)` con `.catch(toast.error)`
  - guard "pause durante realtime echo recent" (`isEditingXxx`)
  - dirty-tracking per evitare save di valori invariati
- [ ] Test del hook: 10 scenari (debounce per tipo, errore server,
      echo durante edit, multi-edit rapido, ecc).

### 5 BIS.1 — Field components context-aware (1-2 g)

Wrapper sopra shadcn primitives che usano `useFormContext`:

- [ ] `FieldInput` (text/number) — debounce 300ms
- [ ] `FieldTextarea` — debounce 500ms
- [ ] `FieldSelect` — no debounce
- [ ] `FieldMultiSelect` — no debounce
- [ ] `FieldCheckbox` / `FieldRadio` — no debounce
- [ ] `FieldDatePicker` — no debounce (su close)
- [ ] `FieldFileUpload` — dirty-tracking + immediato
- [ ] `FieldAddressInput` (compound: via/civico/cap/città) — gestisce
      anche la race condition INSERT/UPDATE indirizzi (già fixata oggi
      in `use-selected-worker-editor`/`ricerca-detail-view`)

### 5 BIS.2 — Pilot su `disponibilita_nel_giorno` (2-3 h)

- [ ] Migrare i 2 handler (`gate1-view.tsx:4547 + 4775`) a
      `<FieldMultiSelect name="disponibilita_nel_giorno" />`.
- [ ] Validare che il bug A.1 sia strutturalmente impossibile col
      nuovo pattern (test componente).
- [ ] Decisione: pattern OK o serve revisione API?

### 5 BIS.3 — Roll-out gate1-view sheet detail (1 settimana)

- [ ] Migrare i 22 handler dei sub-component inline del pannello
      detail Gate1 a Field components.
- [ ] Test componente per ognuno (smoke: il cambio chiama
      `patchWorker` con i parametri attesi).
- [ ] Verificare che i bug A.2 + tutti i C-derivati di Gate1 siano
      chiusi.

### 5 BIS.4 — Lint rule "vietato handler hand-rolled" (1 g)

- [ ] Lint rule ESLint custom: pattern `on*Change={(values) => {
      setXxxDraft(...); ... }}` in pannelli detail → errore.
      Suggerimento: `<FieldXxx name="..." />` o `useFormContext`.
- [ ] Codemod automatico per la migrazione (best effort, con
      override manuale ammesso).
- [ ] Allegata Wave: aggiunge lint per Classe A (`on*Change` senza
      `patch*`) e Classe B (`catch` con `setError` senza `toast`)
      — completa la copertura sintattica delle 10 classi audit.

### 5 BIS.5 — Roll-out CRM onboarding (1 settimana)

- [ ] zod schema per `ProcessoRecord` (campi CRM)
- [ ] `<CrmEditorForm>` con `useAutoSaveFormFields` agganciato a
      `useCrmPipelinePreview.updateProcessCard`.
- [ ] Migrare ~15 handler nelle card `onboarding-*`.

### 5 BIS.6 — Roll-out Rapporto + Assunzioni + Variazioni (1 settimana)

- [ ] Migrare i ~50 handler nei 3 pannelli detail.
- [ ] Verifica copertura via lint rule: 0 warning sui pattern legacy.

**Done**: ogni multiselect/select/input dei pannelli detail usa
`useFieldEditor`. Bug "handler senza save" strutturalmente impossibile.
Lint rule blocca regressioni a pre-push.

## FASE 5 TER — Split god-hook + smart/dumb components

**Obiettivo**: spezzare gli hook giganti in moduli di responsabilità
singola, e separare smart (logic) da dumb (presentational) components.
Riduce il blast-radius dei refactor + abilita memoization mirata.

**Razionale** (post audit-response 2026-05-28 + confronto con dev esterno):
- `use-lavoratori-data.ts` ha 2242 righe e gestisce: paginazione,
  filtri, selection, detail loader, realtime, mutations, schema lazy
  load, related selections — almeno 7 responsabilità in 1 file.
- `use-selected-worker-editor.ts` ha ~1000 righe e gestisce 8 sezioni
  draft + save + error per ognuna — pattern ripetuto 8 volte.
- I god-component (`gate1-view 5627`, `ricerca-workers-pipeline-view
  2885`, `lavoratori-cerca-view 2578`) re-renderano tutto su ogni
  evento realtime perché non hanno `React.memo` mirato sui sub-component.

### Smart/dumb pattern target

```
useGate1Data()              ← hook: fetching/state (smart logic)
  ↓ props
<Gate1View>                 ← container: orchestrazione (smart)
  ↓ props
<WorkerCard memo>           ← presentational (dumb)
<FieldMultiSelect>          ← data-binding via context (smart "field")
```

**Stima**: 2-3 settimane (lavorabile in parallelo a 5 BIS).

### 5 TER.1 — Split `use-lavoratori-data` in 7 hook (1 settimana)

- [ ] `useLavoratoriPagination` — paginazione + sorting + grouping
- [ ] `useLavoratoriFilters` — filtri saved views + apply
- [ ] `useLavoratoriList` — query rows + total + columns
- [ ] `useSelectedLavoratore` — selection state
- [ ] `useSelectedLavoratoreDetail` — detail loader (docs, esperienze,
      referenze) — gestisce `realtimeTick` correttamente per Pattern B
- [ ] `useGate1Filters` (specifico Gate1) — provincia, followup,
      richiesta presenze
- [ ] `useGate2Filters` (specifico Gate2)

Ogni hook ha test unitario dedicato. Niente cambia per i consumer
ad eccezione del nome dell'hook chiamato.

### 5 TER.2 — Split `use-selected-worker-editor` per sezione (1 settimana)

Le 8 sezioni del worker editor diventano 8 hook + 8 Field components:

- [ ] `useWorkerHeaderEditor` + `<HeaderForm>`
- [ ] `useWorkerAvailabilityEditor` + `<AvailabilityForm>`
- [ ] `useWorkerAddressEditor` + `<AddressForm>` (include race fix
      indirizzi già su main)
- [ ] `useWorkerJobSearchEditor` + `<JobSearchForm>`
- [ ] `useWorkerSkillsEditor` + `<SkillsForm>`
- [ ] `useWorkerExperiencesEditor` + `<ExperiencesForm>`
- [ ] `useWorkerReferencesEditor` + `<ReferencesForm>`
- [ ] `useWorkerDocumentsEditor` + `<DocumentsForm>`

Ogni hook si appoggia su `useAutoSaveFormFields` (vedi FASE 5 BIS).

### 5 TER.3 — React.memo + useCallback su sub-component (3-5 g)

- [ ] `gate1-view.tsx`: ognuno dei 22 sub-component `Gate*Card`
      diventa file separato con `React.memo`.
- [ ] Callback hand-rolled passate come prop → estratte con
      `useCallback` (stabilizza identity).
- [ ] AG Grid `getRowId`/`isFullWidthRow`/`fullWidthCellRenderer`
      stabilizzati (riferito a PERF-04 audit esterno).

### 5 TER.4 — Lint rule "god-hook size limit" (mezza giornata)

- [ ] Lint rule: file `use-*.ts` con > 500 LOC → warning.
- [ ] File `*.tsx` con > 800 LOC → warning.
- [ ] Limite soft, non error — incentiva split senza bloccare PR.

**Done**: nessun god-hook > 500 LOC, nessun god-component > 800 LOC.
Re-render dei sub-component limitato ai cambi di prop effettivi.

## FASE 5 QUATER — react-hook-form residuale per form complessi (rinviata)

**Stima**: 1-2 settimane.

La FASE 5 BIS copre già la maggioranza dei casi. Resta per:

- [ ] `worker-profile-header.tsx` se non ancora migrato in 5 BIS
- [ ] Modali multi-campo con submit unico (creazione nuovo lavoratore,
      modale assegnazione operatrice, ecc)
- [ ] Validation cross-field (es. fee min/max)

**Done**: nessun `useState(buildDraft(prop))` rimasto fuori da
react-hook-form o Field components.

## FASE 6 BIS — Realtime hardening (anti-freeze + reconnect)

**Obiettivo**: chiudere le 2 classi residue "non si vede aggiornato"
segnalate dall'audit esterno (§4.1 e §4.3) e validate da audit-response §4.

**Stima**: 1 settimana.

### 6 BIS.1 — Anti-freeze G-009 strutturale (2-3 g)

- [ ] Refactor `pendingWriteCount` da singleton globale a
      Map per-tabella in `anagrafiche-api.ts:427`.
- [ ] L'orchestrator `use-realtime-board-sync.ts:64` consulta
      solo il counter della propria tabella.
- [ ] Safety-net: timeout 8s di deferral oltre il quale procede
      comunque + auto-reset counter stantio.
- [ ] Rimuovere la gestione manuale fragile in
      `rapporto-detail-panel.tsx:929-1010` a favore del path
      bilanciato (`updateRecord` con `trackWrite`).
- [ ] Test componente che simula un'interleaving sfavorevole e
      verifica che il counter resta bilanciato.

### 6 BIS.2 — Reconnect / resync realtime (1-2 g)

- [ ] Esporre `onStatusChange?: (status: string) => void` in
      `useRealtimeRows`.
- [ ] Listener `window 'online'` + `visibilitychange` nell'orchestrator,
      con resync su `CHANNEL_ERROR / TIMED_OUT / CLOSED → SUBSCRIBED`.
- [ ] Throttling: max 1 resync ogni 5s.
- [ ] `refetchOnReconnect: true` in `query-client.ts:19`.

### 6 BIS.3 — `realtime.setAuth(token)` su `TOKEN_REFRESHED` (1 h)

- [ ] Listener Supabase auth state `TOKEN_REFRESHED` chiama
      `supabase.realtime.setAuth(newToken)`. Senza questo, dopo 1h
      di sessione i canali smettono di ricevere eventi se la
      publication ha RLS (segnalato come RT-04 nell'audit Elon).

### 6 BIS.4 — OCC (Optimistic Concurrency Control) per scritture (3-5 g)

**Razionale** (dev esterno non l'ha menzionato, ma è critico):
oggi `update-record` fa `UPDATE … WHERE id` senza check su versione.
Due operatori sullo stesso campo: la scrittura del primo viene persa
silenziosamente quando il secondo salva.

Mappa al finding D6 dell'audit esterno + bug RAP-024-like (segnalazioni
"ho salvato e poi il mio collega ha sovrascritto").

- [ ] Aggiungere colonna `aggiornato_il` ai write check delle edge function
      `update-record`: `WHERE id=? AND aggiornato_il=?`.
- [ ] In caso di mismatch (409 Conflict), il FE:
  - refetcha il record
  - mostra toast "Il record è stato modificato da un altro utente.
    I tuoi cambi sono stati preservati come bozza. Vuoi sovrascrivere?"
  - propone diff campo per campo
- [ ] `idempotency_key` su `create-record` (UUID generato lato client) per
      idempotenza dei retry.
- [ ] Outbox pattern per side-effect verso Make (no doppio-fire).

### 6 BIS.5 — Debounce per tipo input nei detail panel (1 g)

**Razionale** (sollevato dal dev esterno): debounce 300ms applicato
uniformemente è subottimo. Select/checkbox dovrebbero salvare
immediatamente, text input dovrebbero attendere il fine-digitazione.

- [ ] Audit dei `useDebouncedSave` esistenti: classificare per tipo
      componente.
- [ ] Settare debounce per tipo nei Field components di FASE 5 BIS:
  - text/number: 300-500ms
  - textarea: 500-700ms
  - select / multiselect / checkbox / radio / datepicker: 0ms
- [ ] Lint rule che vieta `useDebouncedSave` con valore custom in JSX
      che non sia text/textarea.

**Done**: chiuse le 2 classi residue "non si vede aggiornato"
(freeze cross-board + drop di rete) + classe "ho perso il mio save
per concorrenza" (OCC). Combinato con FASE 4 TER (toast) e FASE 5 BIS
(editor pattern), copertura ~98% delle segnalazioni "non si salva /
non si aggiorna".

## FASE 6 — Valutazione sync engine (decisione)

**Stima**: 1 settimana.

- [ ] Documento di confronto PowerSync vs Zero vs ElectricSQL per stack
      Supabase. Pro/contro/costi.
- [ ] POC su 1 pagina (es. Lavoratori Cerca): 5 giorni spike, no rollout.
- [ ] Decisione GO / NO-GO con stakeholder.

**Done**: scelta strategica documentata. Se GO → FASE 7. Se NO-GO → FASE 5
è la soluzione finale.

---

## Cosa NON facciamo (no scope creep)

- ❌ CRDT (Yjs) — overkill.
- ❌ E2E Playwright full-suite — ROI basso, costoso, fragile.
- ❌ Riscrittura dell'app — tutto incrementale.
- ❌ Cambiare Supabase.
- ❌ **REST API custom** in sostituzione di Edge Functions.
  Aggiungerebbe un altro layer (server backend separato + hop di rete +
  manutenzione). La strada corretta è **RPC `*_v1` dedicate dentro
  Postgres** — già piano FASE 4 BIS. Postgres RPC sono più veloci di
  REST custom perché vivono nel DB. Edge Functions restano per logica
  cross-tabella (es. lookup-values + caching).
- ❌ **`useFieldEditor` custom puro** come primitive principale.
  Reinventa pezzi (validation, type-safety, accessibility) che
  `react-hook-form + shadcn Form + zod` hanno già risolto. Strada:
  RHF + thin wrapper custom per autosave/realtime (FASE 5 BIS).

## Tracking

1. Questo file è la **single source of truth** del piano.
2. Ogni fase chiusa = commit + checkbox spuntato.
3. Review settimanale di 5 minuti.
4. Bug imprevisto: prima si chiude (fix + test stile FASE 2), POI si
   torna alla roadmap.

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Fase 3 trova decine di file vulnerabili | Prioritizza per traffico utente. Top 5 a settimana, non tutto insieme. |
| react-hook-form rompe altre cose | Test componente prima, durante, dopo la migrazione. |
| Team perde fiducia perché "ogni fix è lento" | Comunicare: "il fix non è in 10 minuti perché stiamo chiudendo la classe per sempre". |
| Sync engine POC fallisce | Restiamo su FASE 5. Non è dramma. |

## Casi reali che hanno informato il piano

### 2026-05-28 — `disponibilita_nel_giorno` non si salva

**Segnalazione utente**: in Gate1, il multiselect "In che momento è
disponibile generalmente?" appariva accettare i cambi ma il valore
tornava al precedente dopo il refresh. Gli altri 2 multiselect
affiancati nello stesso pannello (`tipo_rapporto_lavorativo`,
`check_lavori_accettabili`) funzionavano normalmente.

**Indagine** (differential debug + lettura codice, ~15 min):

1. Confronto handler in `gate1-view.tsx`: i 3 handler sono visivamente
   identici, ma `onDisponibilitaNelGiornoChange` (`:4547` + `:4775`)
   aggiorna solo `setAvailabilityDraft(...)` senza chiamare
   `patchSelectedWorkerField(...)`.
2. Verifica DB: nessun CHECK constraint, nessuna RLS bloccante, nessuna
   logica edge function specifica per quella colonna. Il bug NON è
   server-side.
3. Verifica design intenzionale: esiste `saveWorkerAvailability()`
   (`use-selected-worker-editor.ts:725`) che salva un pacchetto
   completo (matrix + vincoli + disponibilità) quando l'utente clicca
   un bottone "Salva". Il design era "save esplicito", ma i 3
   multiselect visualmente identici creano aspettativa di autosave.

**Verdetto**: handler che dimentica il save. Allineare a coerenza con
i 2 fratelli (autosave immediato) — FASE 4 TER.1.

**Mappatura agli interventi proposti**:

| Intervento | L'avrebbe catturato? |
|---|---|
| Toast (FASE 4 TER) | ❌ NO — nessuna chiamata fallisce, semplicemente non parte |
| Anti-freeze (FASE 6 BIS.1) | ❌ NO — bug FE, non realtime |
| Custom hook `useFieldEditor` (FASE 5 BIS) | ✅ SÌ — pattern centralizzato rende impossibile dimenticare |
| Lint rule "handler hand-rolled" (FASE 5 BIS.4) | ✅ SÌ — blocco a pre-push |
| Audit retroattivo "save bypass class" (era FASE 3) | ✅ SÌ — ma non l'aveva coperto |
| Split god-component (audit esterno D2) | ⚠️ Parziale — leggibilità aiuta code review |

**Insegnamento**: per questa classe specifica ("save bypass" su handler
hand-rolled), gli interventi FASE 5 BIS sono più efficaci del toast
(FASE 4 TER). Il toast aiuta su una classe diversa (save che parte ma
fallisce server-side). Le 2 classi coesistono e richiedono fix entrambe.

Questo caso ha informato l'ordine di sequenziamento:
- **Toast prima** (FASE 4 TER): perché dà visibility immediata + cattura
  bug RLS/enum/timeout che oggi sono ciechi
- **Editor pattern dopo** (FASE 5 BIS): perché chiude strutturalmente la
  classe più frequente, ma è work-stream di settimane

---

## Risorse di riferimento

- [TanStack Query — Mastering Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TkDodo blog](https://tkdodo.eu/blog) — tutti gli articoli su React Query
- [Linear sync engine](https://linear.app/blog/scaling-the-linear-sync-engine)
- [Zero by Rocicorp](https://zero.rocicorp.dev)
- [PowerSync](https://powersync.com)
- [ElectricSQL](https://electric-sql.com)
- [react-hook-form](https://react-hook-form.com)
- [docs/realtime-board-pattern.md](./realtime-board-pattern.md) — Pattern
  A e Pattern B documentati internamente.
