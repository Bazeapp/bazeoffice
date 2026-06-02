# bazeoffice — Handover tecnico

> Documento di knowledge-sharing per dev. Scritto incrociando una lettura
> ravvicinata di `src/**`, `supabase/**`, config di build/test/CI e i doc in
> `docs/`. Riferimenti `file:linee` precisi così puoi saltare direttamente al
> codice. Aggiornato: 2026-05-29 (branch `realtime-bug-class-plan`).

## Indice

1. [Cos'è e in che stato è](#1-cosè-e-in-che-stato-è)
2. [Stack](#2-stack)
3. [Architettura a strati + data flow](#3-architettura-a-strati--data-flow)
4. [Routing (custom, niente react-router)](#4-routing)
5. [Data layer — lettura](#5-data-layer--lettura)
6. [Data layer — scrittura + write tracking](#6-data-layer--scrittura--write-tracking)
7. [Realtime + la "realtime bug class"](#7-realtime--la-realtime-bug-class) ⭐
8. [Anatomia di un board hook](#8-anatomia-di-un-board-hook)
9. [Pattern delle mutation](#9-pattern-delle-mutation)
10. [Componenti / UI](#10-componenti--ui)
11. [Modello di dominio + DB](#11-modello-di-dominio--db)
12. [Edge Functions](#12-edge-functions)
13. [Tooling: test, lint, CI, build](#13-tooling-test-lint-ci-build)
14. [Master list dei gotcha](#14-master-list-dei-gotcha)
15. [FAQ "dove tocco se devo fare X"](#15-faq-dove-tocco-se-devo-fare-x)
16. [Mappa dei documenti](#16-mappa-dei-documenti)

---

## 1. Cos'è e in che stato è

Back-office interno di **Baze** (agenzia di matching lavoratori domestici/caregiver ↔ famiglie). Copre l'intero ciclo: lead → sales/CRM → assegnazione recruiter → ricerca candidati → prove/colloqui → assunzione → rapporto attivo → payroll → variazioni/chiusure → riattivazioni → support.

È una **SPA React** servita da **GitHub Pages** (base path `/bazeoffice/`), con backend **Supabase** (Postgres + Edge Functions Deno + Realtime + Auth). Il DB è una **migrazione da Airtable** (da cui le colonne `airtable_*`, `metadati_migrazione`, e molti FK tipati `string | null` senza vincolo reale).

**Stato attuale:** branch `realtime-bug-class-plan`. Quasi tutto il lavoro recente ruota attorno a una classe di bug realtime (campi del detail che spariscono/diventano stantii quando un altro utente edita). C'è un piano multi-fase (`docs/realtime-bug-class-plan.md`): tests + lint guardrail completati fino a **FASE 4**; l'hardening comportamentale (toast, field-editor astratto, reconnect realtime) è ancora roadmap. 34 issue funzionali aperti tracciati in `roadmap-issues-2.md`.

---

## 2. Stack

| Area | Tecnologia |
|---|---|
| Framework | React **19.2** + TypeScript **5.9** (strict) + Vite **7** |
| Styling | TailwindCSS **4.1** (via `@tailwindcss/vite`, **config-less**, no PostCSS), token CSS in `src/index.css` |
| UI primitives | **Radix UI** (maggioranza) + **1 componente Base UI** (`combobox`) + shadcn-style vendored (`cva` + `tailwind-merge`) |
| Data/state | **TanStack React Query 5** (source of truth), React Table 8, React Virtual 3 |
| Griglie | **AG Grid Community 35** (solo Anagrafiche) **+** TanStack Table (resto) — vedi §10.6 |
| Filtri UI | bespoke AST (`data-table-filters.ts`) app-wide **+** `react-querybuilder` (solo Anagrafiche) |
| Mappe | Leaflet |
| Backend | Supabase: Postgres, Edge Functions (Deno), Realtime, Auth |
| Test | Vitest **4** + Testing Library + happy-dom |
| Dev | Storybook **10**, ESLint **9** (flat, regole custom), Lefthook **2** |

Note insidiose: `next-themes` è in `package.json` ma **mai importato** (theming è custom, `src/components/theme/`). `components.json` (shadcn `radix-nova`) esiste ma i componenti sono vendored in-repo.

---

## 3. Architettura a strati + data flow

```
                                 ┌─────────────────────────────────────┐
   UI (pages / feature views)    │  app-shell → app-pages (lazy) →      │
                                 │  board-view (kanban) / detail-shell  │
                                 └───────────────┬─────────────────────┘
                                                 │ usa
                                 ┌───────────────▼─────────────────────┐
   Board hooks (use-*-board.ts)  │ useQuery + mutations + realtime sync │
                                 └───────┬───────────────────┬─────────┘
                          legge          │                   │  scrive
                                 ┌────────▼────────┐  ┌───────▼──────────────┐
   Data layer (src/lib)          │ anagrafiche-api  │  │ updateRecord /        │
                                 │ (read helpers +  │  │ createRecord /        │
                                 │  cache + RPC)    │  │ deleteRecord (tracked)│
                                 └───┬─────────┬────┘  └───────┬──────────────┘
                                     │ rpc     │ edge          │ edge
                       ┌─────────────▼──┐ ┌────▼──────────┐ ┌──▼─────────────────┐
   Supabase            │ *_board RPC    │ │ table-query   │ │ update/create/     │
                       │ (server-side)  │ │ (whitelist)   │ │ delete-record      │
                       └────────────────┘ └───────────────┘ └────────────────────┘
                                     ▲                                  │
                                     │       Realtime (CDC)             │ scrive
                                     └────────── publication ◄──────────┘
                                          (use-realtime-rows)
```

**Le 5 cose da interiorizzare subito:**

1. **React Query è la source of truth.** `staleTime: Infinity`, niente refetch su focus/reconnect/mount. Le invalidation arrivano **solo** da: (a) successo di una mutation strutturale, (b) eventi realtime. (`src/lib/query-client.ts`)
2. **Tre vie di lettura**: RPC dedicate per board (veloci, server-side) · edge `table-query` (gateway generico con whitelist) · `lookup-values` (enum). Vedi §5.
3. **Tutte le scritture passano da 3 writer centrali** (`updateRecord`/`createRecord`/`deleteRecord`) che sono **tracked** per la soppressione dell'eco realtime. Vedi §6.
4. **Ogni board si iscrive al Realtime** e si auto-aggiorna in modo silenzioso e debounced. Tutto il rischio architetturale del progetto vive qui. Vedi §7.
5. **C'è una doppia cache** (promise-cache in `anagrafiche-api` con TTL 10s/5min **+** React Query) che NON condividono invalidation. Vedi §5/§14.

---

## 4. Routing

**Non c'è una libreria di routing.** È un sistema di slug custom in `src/routes/app-routes.ts` che pilota un singolo oggetto di stato tenuto in `AppShell`.

- `MainSection` = union di ~17 literal (`"anagrafiche" | "crm_pipeline_famiglie" | "ricerca_pipeline" | "gestione_contrattuale_rapporti" | "payroll_cedolini" | …`).
- `AppRoute = { mainSection, anagraficheTab, ricercaProcessId, selectedRapportoId?, selectedWorkerId? }`.
- `resolveRouteStateFromPath(pathname)` → if-chain che parse-a lo slug in `AppRoute`; `buildPathForRoute(route)` è l'inverso. Entrambe rispettano `import.meta.env.BASE_URL`.
- `AppShell` (`src/components/layout/app-shell.tsx`) tiene `useState<AppRoute>` e sincronizza l'URL con `history.pushState/replaceState` (no nav reale) + listener `popstate`.
- Dispatch pagine: `src/pages/app-pages.tsx` è uno switch gigante `if (route.mainSection === …) return <XPage/>`; **ogni pagina è `React.lazy`** (code-split per sezione).
- **Master/detail** (es. ricerca board ↔ detail) si fa **ramificando dentro `app-pages.tsx`** su un campo id (`ricercaProcessId ? <RicercaDetailPage/> : <RicercaBoardPage/>`), non con un route-segment component.

⚠️ Aggiungere una sezione = toccare **4 punti**: `app-routes.ts` (union + resolve/build), `app-shell.tsx` (handler `onOpen*`), `app-sidebar.tsx` (nav data + switch `handleChildClick`), `app-pages.tsx` (dispatch).

---

## 5. Data layer — lettura

File chiave: `src/lib/anagrafiche-api.ts` (~1671 righe), `supabase-edge.ts`, `supabase-client.ts`, `query-client.ts`, `query-profiler.ts`.

### Due transport verso Supabase coesistono
1. **`invokeEdgeFunction`** (`supabase-edge.ts:104`) — `fetch` a mano verso `${VITE_SUPABASE_FUNCTIONS_URL}/<fn>`, auth manuale + retry. Usato da: writer CRUD generici, `table-query`, `lookup-values`, automazioni, stripe-connect.
2. **SDK Supabase** (`supabase.rpc` / `supabase.from`) — usato da tutte le RPC board, `provincie`, AI generation (`supabase.functions.invoke`).

Entrambi passano da `profiledFetch` (`query-profiler.ts`, il `global.fetch` è overridden in `supabase-client.ts`).

### Tre vie di lettura
- **RPC board** (es. `fetchRicercaBoard`→`ricerca_board`, `fetchCedoliniBoard`→`cedolini_board`, le gate `fetchGate1Lavoratori`→`gate1_lavoratori`). Query ottimizzate single-round-trip. Vedi §11.3 per cosa ritorna ciascuna.
- **`table-query`** (gateway generico): `fetchFamiglie`, `fetchLavoratori`, `fetchRapportiLavorativi`, … tutte delegano a `queryTable<T>` (`:597`) che hardcoda tabella + orderBy. Vedi §12.1 per il meccanismo whitelist.
- **`lookup-values`**: `fetchLookupValues()` (`:1455`) → enum/multi_enum per dropdown, cache 5 min.

### Caching a due livelli (⚠️ footgun)
`anagrafiche-api.ts` ha **promise-cache module-level** indipendenti da React Query: board/table TTL **10s**, lookup/provincie TTL **5min**. `clearReadCaches()` (`:581`) le svuota dopo ogni write (ma **non** tocca React Query né `provincieCache`). La freshness UI dipende da realtime echo + invalidation dei singoli hook, **non** da questo clear. Una lettura che bypassa React Query può servire dati fino a 10s stantii dopo il write di un'altra tab.

### Config React Query (`query-client.ts`)
```ts
queries:   { staleTime: Infinity, gcTime: 5min, refetchOnWindowFocus: false,
             refetchOnReconnect: false, refetchOnMount: false, retry: 1 }
mutations: { retry: 0 }
```

### `invokeEdgeFunction` — dettagli (`supabase-edge.ts:104`)
- Richiede sessione loggata: throw `"Missing authenticated session"` se manca `access_token`. Niente fallback anon.
- Header: `apikey: anon`, `Authorization: Bearer <user token>`.
- Retry: fino a 3 tentativi su 5xx/408/429 e su errori network/`TypeError`. ⚠️ **Non idempotency-aware**: un `create-record` andato a buon fine server-side ma fallito a livello network può essere ritentato → possibili insert duplicati.

### Profiler
`query-profiler.ts` instrumenta ogni fetch. Attivo sempre in DEV; in prod via `?queryProfiler=1`. Console API: `window.__BAZE_QUERY_PROFILER__` (`.export()`, `.getEvents()`, …). Ring buffer 500 eventi.

---

## 6. Data layer — scrittura + write tracking

### I tre writer centrali (`anagrafiche-api.ts:1590+`)
```ts
updateRecord(table, id, patch)  → edge "update-record"  → trackWrite + clearReadCaches
createRecord(table, values)     → edge "create-record"  → trackWrite + clearReadCaches
deleteRecord(table, id)         → edge "delete-record"   → trackWrite + clearReadCaches
```
I tipi `UpdateTableName`/`CreateTableName`/`DeleteTableName` sono union diverse tra loro (create è un subset stretto). Vedi §12.2.

### Il pending-write counter (cuore della soppressione eco) — `anagrafiche-api.ts:498-575`
Questo è **il meccanismo non-ovvio più importante del progetto**. Due stati globali + helper:
```ts
let pendingWriteCount = 0      // quante scritture in volo adesso
let lastLocalWriteAt = 0       // timestamp dell'ULTIMA scrittura andata a buon fine

beginPendingWrite()  // ++count   (+ installa beforeunload guard)
endPendingWrite()    // --count, stampa lastLocalWriteAt = now()
getPendingWriteCount()           // → count
getMillisSinceLastLocalWrite()   // → ms dall'ultimo write OK (∞ se mai)
runTracked(promise)              // wrappa una write arbitraria nel counter
```
`trackWrite` (interno ai 3 writer) fa `++count` → `await op` → on success `lastLocalWriteAt = now()` → `finally --count`. È un intero, quindi il **nesting è safe** (un board mutationFn che chiama `updateRecord` è doppio-tracked = innocuo by design).

**Tre punti che alimentano il counter:**
1. I 3 writer centrali (auto-tracked).
2. `useDebouncedSave` — `beginPendingWrite()` al primo keystroke, `endPendingWrite()` al settle. Così tutta la raffica di battitura conta come **una** scrittura continua e il realtime non ricarica mid-typing.
3. `useBoardMutation` — `mutationFn: (v) => runTracked(mutationFn(v))` (wrap difensivo, anche per mutationFn raw).

**Perché esiste** → vedi §7. (Bonus: mentre c'è un write pendente, `beforeunload` avvisa l'utente prima di chiudere la tab.)

⚠️ Se bypassi i 3 writer (raw `supabase.from().update()`, `invokeEdgeFunction`, `rpc`) **devi** avvolgere in `runTracked(...)` / `runTrackedEdgeFunction(...)`, altrimenti la finestra-eco non riconosce la tua scrittura e il board ricarica inutilmente (e può clobberare lo stato ottimistico). In FASE 3 sono stati trovati 3 bypass reali.

---

## 7. Realtime + la "realtime bug class" ⭐

Questa sezione è il motivo per cui esiste metà del codice difensivo. Leggila bene.

### 7.1 `useRealtimeRows` (`src/hooks/use-realtime-rows.ts`)
Sottoscrive la CDC Postgres per un set di tabelle. Un solo channel `realtime-rows:<tables.join(",")>`, un listener per tabella con `event: "*"` (INSERT/UPDATE/DELETE). Normalizza il payload in `{table, eventType, newRow, oldRow}` e chiama l'handler (tenuto in ref, così una closure inline non ri-sottoscrive). **Resubscribe solo se cambia `tables.join(",")`** → definisci sempre `XXX_REALTIME_TABLES` come **costante module-level** (un array literal inline ricreato a ogni render distrugge/ricrea il channel).

### 7.2 `useRealtimeBoardSync` (`src/hooks/use-realtime-board-sync.ts`)
Orchestratore per-board. Costanti: `DEFAULT_DEBOUNCE_MS = 600`, `LOCAL_WRITE_ECHO_WINDOW_MS = 2500`.

Su **qualsiasi** evento realtime di una tabella sottoscritta, esegue `scheduleReload()`:
```
scheduleReload():
  clearTimeout(timer)                                  // (debounce: collassa raffiche)
  timer = setTimeout(() => {
    if (getPendingWriteCount() > 0) { scheduleReload(); return }   // (A) DEFER
    if (getMillisSinceLastLocalWrite() < 2500) { return }          // (B) ECHO SUPPRESS
    await reload()                                                  // (C) RELOAD board
    reloadOpenDetail?.()                                            //     poi ri-arricchisce detail
  }, debounceMs)
```
- **(A) Deferral**: se ho scritture in volo, **ri-rinvia** invece di ricaricare → non clobbera mai lo stato ottimistico mid-save.
- **(B) Echo suppress**: se l'ultimo write OK è < 2500ms fa, l'evento è l'eco del **mio** write → lo droppo del tutto (lo stato ottimistico è già corretto).
- **(C) Reload**: solo se nessun write pendente E fuori dalla finestra-eco. `reloadOpenDetail` gira **dopo** `reload()` (ordine cruciale: arricchire il detail prima che il board si assesti verrebbe subito sovrascritto).

`lastLocalWriteAt` si stampa **solo on success** → un write fallito non sopprime un cambiamento remoto genuino.

### 7.3 La bug class (`docs/realtime-board-pattern.md`)
Un board è **vulnerabile** se e solo se valgono **tutti e 3** contemporaneamente:
1. una `useQuery`/stato popolato da una SELECT **ristretta** (solo campi preview);
2. un detail loader **separato** che carica più colonne (`*_detail` RPC, `fetch*ById`, `loadSelectedXxx`);
3. detail e board **condividono stato** — direttamente (stesso queryKey + `setQueryData`) o indirettamente (effect che ri-popola stato React derivato dal board).

Se manca uno dei tre, è sano (es. `use-ricerca-board` tiene il detail in stato locale mai scritto nella cache del board → NON vulnerabile). Sintomo: "i campi del detail spariscono/diventano stantii quando un altro utente edita da un'altra scheda".

### 7.4 I due pattern di fix

**Pattern A — merge preservante** (board+detail condividono cache). Canonico: `use-crm-pipeline-preview.ts`; applicato anche su assunzioni/chiusure/variazioni.
1. **Binding tables** `(colonnaDB → campoCard)` per ogni sorgente (es. `PROCESS_FIELD_BINDINGS`, `FAMILY_FIELD_BINDINGS`, `ADDRESS_FIELD_BINDINGS`, `RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS`).
2. **`preserveMissingFields(card, previous, row, bindings)`**: per ogni binding, se la colonna sorgente **non è presente** nel payload fresco → ripristina dalla `previousCard`; se è presente (anche `null`) → **vince il fresco** (così i clear su DB si propagano — non "fixarlo" per skippare i null!).
3. **`getPreviousCard(id)` legge la cache AL MOMENTO DEL MAPPING**, non all'inizio del `queryFn` → evita la race con un `setQueryData` concorrente di un detail loader.

**Pattern B — trigger su `realtimeTick`** (detail in stato React separato). Canonico: `use-lavoratori-data.ts`.
- Stato `realtimeTick` incrementato in `reloadSilently` (la callback `reload` passata a `useRealtimeBoardSync`).
- Gli effect che caricano il detail mettono `realtimeTick` nei deps → si ri-eseguono. Per effect con gate interni: tracciare l'ultimo tick fetchato e bypassare il gate quando cambia.
- ⚠️ In `use-lavoratori-data` i 3 effect detail **omettono volontariamente** `realtimeTick` (documentato `:1906-1917`): tutti i save passano da `trackWrite` → la soppressione-eco già deduplica, e l'anti-overwrite della draft è gestito dai guard `isEditingXxx` in `useSelectedWorkerEditor`. Non copiare ciecamente questa omissione.

### 7.5 Classi sorelle
- **"draft cancellata dall'eco realtime"** → guard `useDebouncedSave.hasUserEditedRef` / `isEditingXxx` (§9 / §10.4). Audit: `docs/audits/audit-draft-resync.md`.
- **"save bypass"** → handler che dimentica di salvare, o write che salta `trackWrite`. Audit: `audit-save-bypass-trackwrite.md`.

### 7.6 Stato del piano (`docs/realtime-bug-class-plan.md`)
FASE 0–4 ✅ (test infra + 55 unit + 14 integration; 4 audit + fix Pattern A su 4 hook; lint guardrail). **Aperti**: CI server-side che blocchi le PR (oggi solo Lefthook locale), FASE 4 TER (toast), FASE 5/6 (field-editor astratto, migrazione react-hook-form, hardening reconnect realtime, valutazione sync-engine).

---

## 8. Anatomia di un board hook

Forma canonica (vedi `use-ricerca-board.ts`, `use-assunzioni-board.ts`, `use-payroll-board.ts`, `use-chiusure-board.ts`, `use-variazioni-board.ts`):

1. **Costanti module-level**: `XXX_REALTIME_TABLES: string[]` + `QUERY_KEY` stabile (o `useMemo` se parametrico).
2. **Fetch via `useQuery`**: `queryFn` chiama la RPC board + `fetchLookupValues()`, mappa le righe in card data, raggruppa per colonna/stage. (Eccezione: `use-lavoratori-data` fa fetch manuale in `useEffect`→`useState` per via di gate/paginazione/Pattern B.)
3. **`setBoardData`** = `useCallback` su `queryClient.setQueryData(QUERY_KEY, …)` per gli optimistic a mano.
4. **`invalidateBoard`** = `useCallback(() => queryClient.invalidateQueries({queryKey}))` → passato come `reload` a `useRealtimeBoardSync` (per gli hook cache-based).
5. **Mutations** via i wrapper di `use-board-mutations.ts` (§9). (CRM è l'outlier legacy: mutations hand-rolled con snapshot→optimistic→rollback.)
6. **`useRealtimeBoardSync({ tables, reload, reloadOpenDetail?, debounceMs? })`**.
7. **Colonne deferred** (opzionale): `loadDeferredColumn(stageId)` con opt-in tracciato in un **`ref`** (non state!) — il `queryFn` è catturato una volta a mount, leggere uno state lì dentro va stantio e azzera le colonne caricate dall'utente al refetch.
8. **Return alla pagina**: `{ loading, error, columns, …mutations, …loaders }`.

---

## 9. Pattern delle mutation

File: `src/hooks/use-board-mutations.ts`. La regola: una mutation o **cambia la struttura del board** (move/create/delete → refetch per riconciliare posizioni/contatori server-derived) **oppure** è un **save per-campo da input debounced** (lo stato ottimistico è già corretto; l'eco realtime rinfresca una volta per raffica). **Invalidate per-keystroke = lag enorme** → è il motivo per cui i patch NON invalidano.

```
usePatchMutation   → invalidateOnSettled: false   (save per-campo debounced)
useMoveMutation    → invalidateOnSettled: true    (drag tra colonne / cambio stato)
useCreateMutation  → invalidateOnSettled: true    (create/delete)
```
Internamente: `mutationFn` wrappata in `runTracked` (difensivo); `onMutate` fa `cancelQueries` + snapshot + `applyOptimistic`; `onError` fa rollback dallo snapshot; `onSettled` invalida solo se `invalidateOnSettled`.

⚠️ Una **regola ESLint** vieta `import { useMutation }` diretto negli hook board (`use-*-board.ts` / `use-*-data.ts` / `use-*-pipeline.ts` / `use-crm-*.ts`). Usa i wrapper.

---

## 10. Componenti / UI

Entry: `main.tsx` (providers) → `App.tsx` (split `/ui/` gallery vs lazy `main-app`) → `MainApp` (gate auth) → `AppShell`.

### 10.1 Shell + sidebar
`app-shell.tsx` tiene `route` + ~18 callback `handleOpen*`. `app-sidebar.tsx` (~740 righe): nav dichiarativa (`sidebarCategoryGroups`), accordion Radix single-open, link `<a href>` reali con `onClick → preventDefault → onOpen*`.

### 10.2 `shared-next/` (building block app-specific, sopra `ui/`)
Pattern compound (`Object.assign(Impl, {Header, Body, …})`) + `data-slot`. I principali:
- **`kanban.tsx`** — `KanbanColumnShell` (chrome colonna, DnD HTML5 nativo, drop legge `dataTransfer text/plain`), `KanbanColumnSkeleton`, `KanbanDeferredColumnAction`. Empty-state via `Children.toArray(...).length` (non `.count`).
- **`record-card.tsx`** — `RecordCard.Header/.Body/.Footer`, accent strip, `selected`, `onClick`.
- **`record-detail-shell.tsx`** — chrome master/detail: tab bar sticky + header + body scrollabile; `embedded` per il nesting.
- **`detail-section-card.tsx`** — `DetailSectionCard`, `DetailSectionBlock` (collassabile), `DetailField` (read-only), `DetailFieldControl` (editabile).
- **`side-cards-panel.tsx`**, **`association-search-field.tsx`** (search→select→link/unlink, debounce nel parent), **`attachment-upload-slot.tsx`**, **`card-meta-row.tsx`**, **`section-header.tsx`** (slot risolti per `child.type` — non wrappare i sub in fragment/HOC).

Composizione tipica board: `BoardView` (hook dati) → `SectionHeader` + `columns.map → KanbanColumnShell → cards.map → RecordCard`. Click card → `onOpenDetail(id)` → shell flippa la route → detail page basata su `RecordDetailShell`.

### 10.3 Data-table — **due sistemi** (attenzione)
- **A. Custom `DataTable`** (`src/components/data-table/`, TanStack): AST filtri bespoke (`data-table-filters.ts`, NON react-querybuilder), filter-builder visuale, toolbar (search + Preferiti/Sort/Group/Filtri), engine `data-table.tsx` (~940 righe, client mode con `evaluateGroup` o `serverQueryMode` con `onServerQueryChange` debounced ~700ms, virtualization opzionale, cell-range copy, detail Sheet). Stato in `use-table-query-state.ts` (filtri **apply-on-button**, search/sort/group **live**, saved views in localStorage).
- **B. react-querybuilder** — **solo** `src/components/anagrafiche/` (RQB con `controlElements` custom, condivide gli operatori con `data-table-filters.ts`).

### 10.4 `DebouncedInput` / `useDebouncedSave`
`src/components/ui/debounced-input.tsx` → `DebouncedInput` / `DebouncedTextarea`, delegano a `use-debounced-save.ts` (`debounceMs` default 300). Comportamenti **load-bearing** (non semplificarli):
- `hasUserEditedRef`: una volta che l'utente ha digitato, un `committedValue` dal server **non** sovrascrive più la draft (anti dropped-chars).
- **Flush-on-unmount**: salva il pending quando il componente si smonta (chiusura sheet).
- Bracketing `beginPendingWrite()`/`endPendingWrite()` → integra la soppressione-eco realtime.

### 10.5 Primitives + theming
`src/components/ui/` (~40 file): Radix + 1 Base UI (`combobox`). `cva` per le varianti, `cn()` = `twMerge(clsx())`. Token CSS in `src/index.css` (Tailwind 4 `@theme`). **Theming custom** (`src/components/theme/`, NON next-themes): toggle `.dark` su `<html>`, persist `localStorage["bazeoffice:theme"]`.

### 10.6 AG Grid vs TanStack Table
- **AG Grid** → solo Anagrafiche (`anagrafiche-ag-grid.tsx`): browser "tabelle DB" con colonne dinamiche, paginazione/sort server-side, grouping custom. Si abbina al path react-querybuilder.
- **TanStack** → il `DataTable` custom e i panel bespoke (`rapporti-list-panel`, `gate1-view`, …).
- Condividono solo le definizioni operatori (`getOperatorsForField`). "La data table" è ambiguo: chiedi sempre quale.

### 10.7 Storybook
~52 story sotto `stories/` (per dominio) + `src/components/shared-next/`. Addons `docs` + `a11y`. C'è anche la route in-app `/ui` (`UiGallery`).

---

## 11. Modello di dominio + DB

> ⚠️ Quasi tutti gli "id" sono tipati `string | null`, **non** UUID/FK enforced. Gli unici FK reali in DB sono `assunzioni.lavoratore_id/famiglia_id` e `audit_logs.actor_user_id`. Il resto sono join per convenzione, risolti a query-time nelle RPC.

### 11.1 Entità core
| Entità (tabella) | Ruolo |
|---|---|
| **lavoratori** | Il lavoratore/caregiver. Profilo denormalizzato ~200 colonne (griglia disponibilità `disponibilita_<giorno>_<fascia>`, skill/rating, docs, NASpI, Stripe, geocache, UTM). |
| **famiglie** | Il cliente household. Billing, NPS, referral, sales log. |
| **processi_matching** | **Oggetto deal/ricerca centrale** (~200 col). Uno per ricerca famiglia. Pilota **due** macchine a stati: `stato_sales` (14 valori, kanban sales) **e** `stato_res` (17 valori, kanban recruiting); `fase_processo_res` è il bucket grezzo. |
| **selezioni_lavoratori** | Candidatura: worker in shortlist per un processo (`processo_matching_id` + `lavoratore_id` + `stato_selezione`). |
| **rapporti_lavorativi** | **Il "contratto" hub.** Lega famiglia↔lavoratore, porta `stato_assunzione/servizio/rapporto`, campi prova, codici payroll webcolf. Spoke centrale per payroll/support/chiusure. |
| **assunzioni** | Form onboarding (lato datore + lato lavoratore), 2 per rapporto. |
| **richieste_attivazione** | Mandato firmato per processo (`fee_concordata`, `signed_document_url`). |
| **chiusure_contratti** | Cessazione. `data_fine_rapporto`, motivo, campi riattivazione. **Nessun FK diretto al rapporto** (vedi gotcha). |
| **variazioni_contrattuali** | Modifica contratto (`rapporto_lavorativo_id`). |
| **contributi_inps** | Contributo INPS trimestrale (`rapporto_lavorativo_id`, `trimestre_id`). |
| **mesi_lavorati** | Il **cedolino** (payslip). `rapporto_lavorativo_id` + `mese_id` + `presenze_id`. |
| **mesi_calendario** | Definizione mese (start/end, festività, trimestre, finestra INPS). |
| **presenze_mensili** | Foglio presenze, **~155 colonne dinamiche per-giorno** (`tipo_day_N`, `ore_day_N`, …). |
| **pagamenti / transazioni_finanziarie** | Stripe payment/checkout. |
| **ticket** | Hub support, **linker polimorfico**: un FK nullable per tipo (`rapporto_id`, `cedolino_id`, `chiusura_id`, …) + `tipo` (Customer/Payroll) + `stato`. |
| **documenti/esperienze/referenze_lavoratori** | Collegate a `lavoratore_id`. |
| **indirizzi** | Tabella indirizzi **polimorfica** (`entita_tabella` + `entita_id` + `tipo_indirizzo`). Ha sia `provincia` (nome) sia `provincia_sigla`. |
| **lookup_values** | Dizionario enum/multi_enum. |
| **operatori** | Staff interno (recruiter/referente). |
| **audit_logs** | Trail append-only field-level. |

### 11.2 Flow business → sezioni
Lead (`anagrafiche`) → Sales (`crm_pipeline_famiglie` `/pipeline`) → Assegnazione (`crm_assegnazione` `/assegnazione`) → Sourcing (`gate_1`/`gate_2`/`lavoratori_cerca`) → Ricerca/RES (`ricerca_pipeline` `/ricerca/:id`) → Prove/colloqui (`prove_colloqui`) → Assunzione (`gestione_contrattuale_assunzioni`) → Rapporto attivo (`gestione_contrattuale_rapporti`) → Payroll (`payroll_cedolini` / `payroll_contributi_inps`) → Variazioni (`gestione_contrattuale_variazioni`) → Chiusure (`gestione_contrattuale_chiusure`) → Riattivazioni (`customer_support_riattivazioni`) → Support (`customer_support_*_ticket`).

### 11.3 Board RPC (le `*_board_rpc.sql`)
Tutte `language sql stable security definer`, granted a `anon, authenticated`, ritornano un envelope `jsonb`. La risoluzione delle label di stage resta client-side via `lookup_values`. Le principali:
- **`crm_pipeline_famiglie_board`** (esteso da `…server_side_filters`): pipeline sales, filtri server-side (search accent-folded, tipo_lavoro, boolean, date range), `stage_counts`. + `crm_pipeline_famiglia_detail(uuid)`.
- **`rapporti_lavorativi_board`**: **deriva un `stato_rapporto` sintetico** da `stato_assunzione` + data chiusura (Attivo/Terminato/In attivazione/Sconosciuto/Errore), sort custom.
- **`assunzioni_board` + `assunzione_detail`**: **risoluzione processo a 3 strategie** (`processi_matching_id` diretto → token UUID dal free-text `id_rapporto` via `parse_uuid_tokens` → fallback per `famiglia_id`).
- **`cedolini_board` + `cedolino_detail`** (agg. `…data_fine_rapporto`): risolve mese via `mesi_calendario`, `distinct on` per ultima transazione/pagamento, merge `chiusure.data_fine_rapporto`.
- **`variazioni_board`** / **`chiusure_board`** / **`riattivazioni_board`**: ritornano `{cards, rapporti}`; chiusura↔rapporto risolto **in modo duale** (`fine_rapporto_lavorativo_id` preferito, fallback `ticket_id`).
- **`support_tickets_bundle(tipo)`**: un envelope con **11 array** (sostituisce un fan-out da 13 chiamate).
- **`ricerca_board(eager_stages, deferred_stages)`**: eager-load processi per stato_res, `deferredCounts` per gli stage lazy. + **`prove_colloqui_board(start, end)`**.
- Gate: **`gate1_lavoratori`** (qualifica + finestra disponibilità + esclusione selezioni attive), **`lavoratore_extras`**, **`ricerca_worker_related_selection_summaries`**.

### 11.4 Lookup + audit
`enum` vs `multi_enum` **non è una colonna**, è derivato dal tipo Postgres (`text` → enum, `ARRAY` → multi_enum). I valori storati sono ormai le **label** (non le key) dopo `20260517170000_restore_lookup_value_labels.sql`. `audit_lookup_normalized_values.sql` è il diagnostico che trova righe ancora "contaminate" con la key. `audit_logs` ha RLS + policy SELECT per authenticated (per mostrare "campo modificato da X").

### 11.5 Tabelle realtime
`20260523210000_enable_realtime_for_board_tables.sql` pubblica **20 tabelle**. **NON** pubblicate: `operatori`, `lookup_values`, `audit_logs`.

### 11.6 Gotcha di data modeling
1. **`chiusure_contratti` senza FK diretto al rapporto** → join via `rapporti_lavorativi.fine_rapporto_lavorativo_id` o via `ticket_id`.
2. **`indirizzi.provincia` (nome) vs `provincia_sigla`** → le RPC preferiscono `indirizzi` con fallback alla colonna flat; i due possono divergere (MI vs Milano). È l'issue bloccante **GT1-015**.
3. **Colonne `airtable_*` + `metadati_migrazione`** legacy ovunque. La delega INPS sta dentro `rapporti_lavorativi.metadati_migrazione.delega_inps_allegati`, non come colonna.
4. **`rapporti_lavorativi.id_rapporto` è free-text** con lista di UUID (parse via `parse_uuid_tokens`).
5. **Campi di stato ridondanti** (`stato_assunzione`/`servizio`/`rapporto`/`riattivazione`; `stato`/`stato_lavoratore`/`stato_profilo`). Il `stato_rapporto` mostrato è **calcolato in SQL**.
6. **Doc worker duplicati**: `documenti_lavoratori.allegato_*` (primario) vs `lavoratori.docs_*` (legacy).
7. **`assunzioni` e `selezioni_lavoratori` non hanno file TS entity** (solo via RPC/whitelist).

---

## 12. Edge Functions

Tutte Deno, CORS permissivo (`*`), POST-only (tranne `geocode-worker-addresses`), JSON in/out, client **service-role** (bypassa RLS).

> ⚠️ **Modello auth**: nessuna funzione autorizza il chiamante nel codice applicativo. L'unica auth è il gateway `verify_jwt` di Supabase, **gestito in dashboard, NON versionato** (non c'è `config.toml`). `resolveAuditActor` decodifica il JWT solo per attribuire l'audit, non rifiuta mai. → è l'unica barriera tra un attaccante e accesso DB service-role illimitato.

### 12.1 `table-query` (~1987 righe) — read gateway con whitelist
- **Whitelist a 2 cancelli**: union `SupportedTable` (compile-time) + `ALLOWED_FIELDS: Record<table, string[]>` (runtime, **la fonte di verità**, `:122-809`). `payload.table in ALLOWED_FIELDS` è il guard vero. 22 tabelle.
- **19 operatori filtro** (`is/is_not/in/has/not_has/starts_with/ends_with/gt/gte/lt/lte/between/is_true/is_false/has_any/has_all/not_has_any/is_empty/is_not_empty`), semantica type-aware in `evaluateCondition`.
- **Due path di esecuzione**: *fast path* server-side (solo AND puro, operatori supportati, niente lookup/search/groupBy → query PostgREST reale con count esatto) vs *slow path* in-memory (OR/search/groupBy/lookup → `fetchAllRows` a batch fino a **`MAX_SERVER_SCAN_ROWS = 25000`**). ⚠️ Oltre 25k righe nello scan → **throw 500** "Server scan limit reached". Tabelle grandi con OR/search/lookup possono 500.
- **Esporre nuovo campo/tabella**: aggiungi alla union + a `ALLOWED_FIELDS` (per un campo basta appenderlo all'array della tabella). Vedi i commit recenti su `provincia_sigla`. **I writer hanno whitelist separate** (esporre in lettura ≠ scrivibile).

### 12.2 Write functions
- **`update-record`** — `{table, id, patch}`. 17 tabelle. Validazione `isSafeColumnName` (Unicode), protected `{id, creato_il}`, **nessuna whitelist per-colonna** (si affida a Postgres). Setta `aggiornato_il`. Side-effect notevoli: `processi_matching.stato_sales` scrive `old_stato_sales`; **`selezioni_lavoratori → "prova schedulata"` fa POST a un webhook Make.com hardcoded** → ⚠️ se il webhook fallisce torna 500 **dopo** che il DB ha già committato (non atomico). Audit field-level.
- **`create-record`** — `{table, values}`. 12 tabelle (subset). `isSafeColumnName` qui è **ASCII-only** (incoerente con update). Protected `{id, creato_il, aggiornato_il}`.
- **`delete-record`** — `{table, id}`. 13 tabelle. Cascade manuale: `esperienze_lavoratori` → cancella prima i `referenze_lavoratori` figli.

### 12.3 Altre
- **`lookup-values`** — `{entity_table?, entity_field?, is_active?}` → tutto matcha (no limit).
- **`update-process-stato-sales`** — variante mono-scopo della logica stato_sales (⚠️ **duplica** logica di update-record, tienile in sync).
- **`run-automation-webhook`** — proxy verso webhook esterni (Make.com / GCP), whitelist di 6 `automationId`. **Niente auth/actor**. `context` del client viene spread nel body in uscita.
- **`geocode-worker-addresses`** — batch geocoder Google Maps (cron/maintenance). `dryRun` **default true** (serve `dryRun:false` per scrivere). Richiede `GOOGLE_MAPS_API_KEY`. ⚠️ errori → **400** (incoerente con le altre).
- **`_shared/audit.ts`** — `resolveAuditActor` + `insertFieldAuditLogs` (best-effort, fallimenti swallowed, solo diff reali loggati).

### 12.4 Footgun trasversali
Whitelist tabelle **divergenti** tra create/update/delete/table-query · 2 regex `isSafeColumnName` incoerenti · side-effect webhook non atomico in update-record · limite scan 25k in table-query · alias `processo_res` (read-only, wrappa scalare in array, ignorato in scrittura) · logica announcement/stato_sales **duplicata** in più funzioni · URL esterni hardcoded (no staging/prod).

---

## 13. Tooling: test, lint, CI, build

### 13.1 ESLint custom (`eslint.config.js`) — i guardrail anti-bug-class
Flat config ESLint 9. `supabase/functions` è **ignorato** (ha il suo linter Deno).
- **`error`** — board hook non possono `import { useMutation }` (usa i wrapper); componenti/pagine non possono importare `clearReadCaches`.
- **`warn`** (debito da migrare, non bloccanti) — selettori `no-restricted-syntax`:
  - `useEffect` con `selectedXxxId` nei deps ma **senza** `realtimeTick` (Pattern B mancante);
  - `<Input/Textarea onBlur=…>` (usa `DebouncedInput`);
  - `disabled` su `DebouncedInput/Textarea` (il disable transitorio durante il save butta fuori il focus);
  - save-on-keystroke (`onChange` che chiama `*Patch/Save/Update/Mutate`);
  - `setXxxDraft()` non guardato dentro `useEffect` (l'eco wipe-a la draft) — variante più precisa che fa match anche sul dep server-row;
  - `useState` mirror seedato da prop server-driven (stantio dopo update realtime);
  - wrapper `Detail*/Scheda*` (Sheet/Panel/Shell) senza `key=` (la draft di un record fluisce nel successivo).

### 13.2 Test (Vitest)
`environment: happy-dom` (non jsdom). Split **per filename**: `*.integration.test.*` vs `*.test.*` (`test:unit` / `test:integration`). Setup `src/test/setup.ts` (jest-dom, `afterEach(cleanup)`, polyfill matchMedia/ResizeObserver/IntersectionObserver). **Niente mock globale Supabase** — ogni test fa `vi.mock` sul seam che serve. `renderHookWithQueryClient`/`renderWithProviders` con QueryClient fresco per test. ~15 file test, molti sono **regression test della bug class** con fixture inline minimali.

### 13.3 CI / hook / build
- **Lefthook**: solo **pre-push** (parallelo): `npm test` + `tsc --noEmit` + `eslint .`. Bypass `LEFTHOOK=0 git push`. Install **manuale** (`npx lefthook install`, non c'è postinstall).
- **GitHub Actions**: un solo workflow `deploy-pages.yml` → build + deploy su GitHub Pages su push a `main` (valida 3 secret VITE, SPA 404 fallback). ⚠️ **CI non esegue test/lint/typecheck** (solo Lefthook locale). ⚠️ Le **edge functions NON sono deployate da CI** (il workflow citato nel README **non esiste**): deploy **manuale** via `supabase functions deploy <name>`.
- **Build**: `tsc -b && vite build`. `base: "/bazeoffice/"`, alias `@`→`src` (duplicato in 4 file: tsconfig×2, vite, vitest, storybook). `manualChunks` per vendor splitting.

### 13.4 Audit scripts (`scripts/`, regex, run manuale)
- **`npm run audit:lookup`** — usi rischiosi di key/label lookup in select/radio/checkbox/patch. **Esce 1** se ci sono finding non-reviewed (hard gate). `REVIEWED_PATHS` allowlist.
- **`npm run audit:autosave[:strict]`** — pattern autosave/draft a rischio (blur su draft stantia, spread di `card` stantio, persist in cleanup, update senza merge della response). Report-only; `--strict` esce 1 sui `high` non-reviewed.

---

## 14. Master list dei gotcha

1. **Router custom** → nuova sezione = 4 file (§4).
2. **Nuovo campo letto dal FE** → ricordati la **whitelist `table-query`** (§12.1).
3. **Mai `useMutation` raw** negli hook board → wrapper (§9). Patch **non** invalidano.
4. **Ogni write deve essere tracked** → se bypassi i 3 writer, `runTracked(...)` (§6).
5. **Pattern A/B** quando tocchi un board con detail loader (§7.4). Binding mancante = campo che sparisce. "present-even-null wins" è voluto.
6. **`getPreviousCard` legge la cache al mapping**, non a inizio queryFn (§7.4).
7. **Opt-in colonne deferred in un `ref`**, non state (§8).
8. **`XXX_REALTIME_TABLES` costante module-level**, non array inline (§7.1).
9. **Doppia cache** (anagrafiche-api 10s/5min + React Query) senza invalidation condivisa (§5).
10. **Retry edge non idempotente** → possibili insert duplicati su `create-record` (§5).
11. **`DebouncedInput`: `hasUserEditedRef` + flush-on-unmount sono load-bearing**, non semplificare (§10.4). Niente `disabled`.
12. **Wrapper `Detail*/Scheda*` con `key={selectedId ?? "__empty__"}`** (§13.1).
13. **Side-effect webhook non atomico** in `update-record` su `selezioni_lavoratori` (§12.2).
14. **Whitelist tabelle divergenti** tra le 4 edge function (§12.4).
15. **`provincia` vs `provincia_sigla`** può divergere (§11.6).
16. **`next-themes` è morto**, theming è custom (§10.5). **Due grid engine, due sistemi filtri** (§10.3/10.6).
17. **Edge functions deploy manuale** (no CI), CI non gira test (§13.3).

---

## 15. FAQ "dove tocco se devo fare X"

**Aggiungere una pagina/sezione** → `app-routes.ts` (union + resolve/build) → `app-shell.tsx` (`handleOpen*`) → `app-sidebar.tsx` (nav + switch) → `app-pages.tsx` (dispatch lazy).

**Aggiungere un campo letto da una tabella esistente** → appendilo a `ALLOWED_FIELDS[table]` in `supabase/functions/table-query/index.ts`, **deploya la function**, poi usalo nel `select` del fetch helper in `anagrafiche-api.ts`. Se è lookup-backed, ricordati che forza lo slow path.

**Aggiungere un campo editabile in un detail** → usa `<DebouncedInput committedValue={…} onSave={v => updateRecord(table, id, {campo: v})}/>`. Se il board ha Pattern A, **aggiungi il campo alla binding table** o sparirà al prossimo refetch realtime.

**Nuovo board kanban** → crea `XXX_board` RPC (migration) → `fetchXxxBoard` in `anagrafiche-api.ts` → `use-xxx-board.ts` (useQuery + wrapper mutation + `useRealtimeBoardSync` con `XXX_REALTIME_TABLES`) → view con `KanbanColumnShell` + `RecordCard`. Decidi subito se è vulnerabile alla bug class (§7.3) e quale pattern applicare.

**Nuovo stato/lookup** → inserisci in `lookup_values` (key + label + metadata.color/filter_type) via migration; le label si vedono automaticamente. Per `stato_res`/`stato_sales` rispetta i set canonici.

**Una mutation strutturale (drag/cambio stato)** → `useMoveMutation`. **Un save per-campo** → `usePatchMutation`. **Create/delete** → `useCreateMutation`.

**Modificare una edge function** → editala in `supabase/functions/`, poi **deploy manuale** `supabase functions deploy <name>` (CI non lo fa). Per le write ricordati le 3 whitelist separate.

**Prima di pushare** → il pre-push gira test+tsc+lint. Se hai toccato lookup-select o autosave, gira anche `npm run audit:lookup` e `npm run audit:autosave:strict`.

---

## 16. Mappa dei documenti

| File | Contenuto |
|---|---|
| `doc.md` | **Mappa DB completa** (entità, campi, catalogo lookup, gap vs table-query) |
| `docs/realtime-board-pattern.md` | **La guida ai Pattern A/B** + checklist PR per board hook |
| `docs/realtime-bug-class-plan.md` | Il piano multi-fase della bug class realtime + stato |
| `docs/audits/audit-2026-05-28-*.md` | Audit completo per classi (A–J) |
| `docs/audits/audit-draft-resync.md` | Bug "draft cancellata dall'eco" |
| `docs/audits/audit-save-bypass-trackwrite.md` | Bug "write non tracked" |
| `docs/audits/audit-key-on-detail-wrapper.md` | Bug "draft che fluisce tra record" |
| `docs/audits/audit-table-query-callers.md` | Censimento chiamanti table-query (FASE 4 BIS) |
| `docs/fe-readonly-control-map.md` / `lookup-key-label-map.md` | Mappe FE controlli/lookup |
| `roadmap-issues-2.md` | **34 issue funzionali aperti** (source of truth) |
| `roadmap.md` | Roadmap estesa |
| `supabase/functions/README.md` | Deploy edge functions (⚠️ cita un workflow CI inesistente) |
| `supabase/audit_lookup_normalized_values.sql` | Diagnostico contaminazione key/label |

---

*Per il riassunto "executive" da presentare a voce, vedi anche la sintesi più breve discussa a parte. Buone ferie. 🌴*
