# Risposta all'audit BazeOffice

> Risposta strutturata alla sintesi audit (`SINTESI_AUDIT_BAZEOFFICE.md`).
> Verificato sul codice + ISSUES (4).docx + branch `realtime-bug-class-plan` al 2026-05-27 su commit `49f13f8`.

## Indice

- [§1 — Sintesi del verdetto](#1--sintesi-del-verdetto)
- [§2 — Finding §1.1: God-component](#2--finding-11-god-component)
- [§3 — Finding §1.2: Salvataggi silenziosi](#3--finding-12-salvataggi-silenziosi)
- [§4 — Finding §1.3: Realtime fragile sotto multi-utente](#4--finding-13-realtime-fragile-sotto-multi-utente)
- [§5 — Finding §1.4: Backlog "✅" inaffidabile](#5--finding-14-backlog--inaffidabile)
- [§6 — Domande di Nicolò (architettura, priorità, refactor 4 settimane)](#6--domande-di-nicolò)
- [§7 — Contesto importante: il branch `realtime-bug-class-plan`](#7--contesto-importante-il-branch-realtime-bug-class-plan)

---

## §1 — Sintesi del verdetto

| Finding                      | Verdetto                               | Gravità | Note                                             |
| ---------------------------- | -------------------------------------- | ------- | ------------------------------------------------ |
| §1.1 God-component           | Vera ma esagerata                      | 6/10    | Scope più stretto: solo gate1 è il caso classico |
| §1.2 Salvataggi silenziosi   | Vera, anzi sottostimata                | 9/10    | Numeri reali peggiori della sintesi              |
| §1.3 Realtime fragile        | Mista: 2 veri P0, 1 obsoleto, 1 minore | 8/10    | §3.3 cache 10s va eliminato dalla lista          |
| §1.4 Backlog ✅ inaffidabile | Esagerata                              | 2/10    | Vedi §5 verifica ticket per ticket               |

**Frase complessiva:**

> "L'ossatura della sintesi è corretta su 2 finding (salvataggi silenziosi, realtime), esagerata su 2 (god-component, backlog ✅). Va dimensionato l'investimento di conseguenza: i fix che hanno alto valore/costo sono concentrati in 2 file (use-board-mutations + use-debounced-save) per i salvataggi e in 2 file (use-realtime-board-sync + use-realtime-rows) per il realtime. Il god-component è debito di medio termine, non emergenza. La verifica dei ticket ✅ contestati restituisce 17% di hit rate dell'audit (1 su 6). Inoltre l'audit non considera il branch `realtime-bug-class-plan` che ha già chiuso retroattivamente metà dei problemi (137 test, 4 fasi completate)."

---

## §2 — Finding §1.1: God-component

### Verdetto

**Vera nella sostanza, esagerata nello scope, parzialmente obsoleta nei numeri. Non sbagliata.**

### Cosa è vero

- I file giganti esistono ma hanno origine diversa e non sono veri problemi.
- Causano i problemi descritti: re-render wholesale, bug a distanza, costo di estensione alto, che però non causano issue nella velocità.
- Sono daccordo con i fix suggeriti e vorrei estenderli anche ad altri blocchi, è una best practice che non abbiamo inserito ma non un debito reale
- Nessun `Context` di dominio nel codice -> questo è un buono spunto che implementerei.

### Cosa è esagerato

#### 1. La sintesi tratta 5 file come "stesso problema". Non lo sono.

| File                                | LOC  | Sub-comp inline | Sub-comp esterni | Tipo di problema                              |
| ----------------------------------- | ---- | --------------- | ---------------- | --------------------------------------------- |
| `gate1-view.tsx`                    | 5627 | **22**          | 6                | God-component **compositivo** (caso peggiore) |
| `assunzioni-detail-sheet.tsx`       | 2928 | 7               | 14               | Misto                                         |
| `rapporto-detail-panel.tsx`         | 1891 | 8               | 10               | Misto                                         |
| `ricerca-workers-pipeline-view.tsx` | 2885 | 1               | 8                | God-component **logico** (logica sparsa)      |
| `lavoratori-cerca-view.tsx`         | 2578 | 1               | 17               | God-component **logico**                      |
| `gate2-view.tsx`                    | 251  | 0               | 2                | Sano ✅                                       |

Solo `gate1-view.tsx` è il "god-component classico" della descrizione. Gli altri hanno problemi diversi che richiedono fix diversi.

#### 2. La sintesi non distingue D1 da D2

Il finding venduto come "spezza i god-component e risolvi anche la rinomina colonna" è falso:

- **D2 (split + memo + Context)** → risolve re-render + leggibilità.
- **D1 (service layer)** → risolve il costo di rinomina colonna DB.

Sono problemi diversi con fix diversi. L'ordine D1 → D2 nella sintesi è corretto, ma il _valore atteso_ di D2 non include la riduzione del costo-rinomina-colonna.

#### 3. Anche su gate1, lo scope è più stretto

| Parte di gate1              | Dove vive oggi                                  | Stato                                                                           |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| Lista card a sinistra       | `lavoratore-card.tsx` (601 righe, file esterno) | ✅ Già estratta. Fix performance = `React.memo` + `useCallback`, ore di lavoro. |
| Sheet di dettaglio a destra | 22 `Gate*Card` inline in `gate1-view.tsx`       | ❌ Da spezzare. Target reale del refactor D2.                                   |

Il vero target del refactor D2 su gate1 è ~2800 righe di sheet, non 5627 righe.

### Cosa è obsoleto

- L'audit dice "0 test automatici". **Falso al 2026-05-27**: oltre ai 4 test su `main`, c'è il branch `realtime-bug-class-plan` con **137 test** organizzati in 4 fasi (vedi §7). D4 della sintesi non parte da zero, parte da una rete di sicurezza già rodata.
- §3.3 (read-cache 10s) si riferisce a una cache **già rimossa** (vedi §4.2 sotto).

> "Il finding sui god-component è corretto nella sostanza ma va dimensionato. Solo gate1 è il god-component compositivo classico (22 sub-componenti inline). Gli altri file giganti (ricerca, cerca-view) hanno un problema diverso — logica sparsa — che si risolve estraendo custom hook, non spezzando componenti. Il refactor D2 quindi non è un blocco unico: è gate1 prima (~2 settimane, alto valore, con split + `React.memo` + Context) e gli altri dopo con tecniche diverse (~1 settimana ciascuno, valore minore, con custom hook). E ricordiamoci che alcuni claim dell'audit sono già obsoleti: i test ci sono (137 sul branch refactor) e la read-cache 10s di §3.3 non esiste più."

---

## §3 — Finding §1.2: Salvataggi silenziosi

### Verdetto

**Vera al 100%.**

Gravità: **9/10**.

### Cosa è vero

Verificato in `src/hooks/use-board-mutations.ts:60-64`:

```tsx
onError: (_error, _variables, context) => {
  if (context?.snapshot !== undefined) {
    queryClient.setQueryData(queryKey, context.snapshot)
  }
},
```

Quando il server rifiuta un save, lo stato torna indietro (rollback) ma **non viene mostrato alcun messaggio all'utente**.

Verificato in `src/hooks/use-debounced-save.ts:58`:

```tsx
void onSaveRef.current(draftRef.current).finally(() => {
  savesInFlightRef.current--;
  endPendingWrite();
});
```

Fire-and-forget. Niente `.catch`. Se la promise rejecta, errore solo in console, niente UI.

### Numeri peggiori della sintesi

#### Punto 1 — 0 board hook su 8 gestisce errori con toast (vs "3 su 24" della sintesi)

| Board hook                     | Importa `sonner`? | Lo usa per errori di save?                   |
| ------------------------------ | ----------------- | -------------------------------------------- |
| `use-assunzioni-board.ts`      | ✗                 | ✗                                            |
| `use-chiusure-board.ts`        | ✓                 | ✗ (solo validazione client _prima_ del save) |
| `use-contributi-inps-board.ts` | ✗                 | ✗                                            |
| `use-payroll-board.ts`         | ✗                 | ✗                                            |
| `use-riattivazioni-board.ts`   | ✗                 | ✗                                            |
| `use-ricerca-board.ts`         | ✗                 | ✗                                            |
| `use-support-tickets-board.ts` | ✗                 | ✗                                            |
| `use-variazioni-board.ts`      | ✗                 | ✗                                            |

Il problema è **concentrato sui file dove l'utente passa la giornata**, non distribuito.

#### Punto 2 — `useDebouncedSave` è usato in 133 posti

`grep -rn "useDebouncedSave(" src/` → 133 risultati. Ogni campo modificabile dell'app passa da qui.

Sono 133 punti di scrittura che falliscono silenziosamente. Non è un bug singolo, è un bug **architetturale**: la primitiva centrale non gestisce gli errori, quindi i 133 utilizzi ereditano il problema.

### Frase di sintesi

> "Il finding salvataggi silenziosi è vero e i numeri reali sono peggiori: 0 board hook su 8 mostrano errori (non 3 su 24) e `useDebouncedSave` — usato in 133 punti dell'app — è fire-and-forget. Il fix base è ~10 righe in 2 file, mezza giornata. Va fatto **per primo**: senza toast su errore non si può misurare se gli altri fix funzionano in produzione. È pre-condizione di tutto il resto."

---

## §4 — Finding §1.3: Realtime fragile sotto multi-utente

### Verdetto

Il finding contiene **4 sotto-problemi**. Verdetto per ciascuno:

| Sotto-problema           | Verdetto        | Gravità | Costo fix |
| ------------------------ | --------------- | ------- | --------- |
| §3.1 anti-freeze         | ✅ vero         | 9/10    |
| §3.3 read-cache 10s      | ❌ **obsoleto** | 2/10    |
| §3.5 reconnect/resync    | ✅ vero         | 8/10    |
| Echo-window 2,5s globale | ✅ vero, minore | 4/10    |

**Verdetto complessivo: 8/10.** Vero nei punti principali. Un sotto-problema obsoleto va eliminato.

### §4.1 — (anti-freeze realtime) ✅ vero, P0

#### Razionale tecnico

**Singleton globale** (`anagrafiche-api.ts:427`):

```tsx
let pendingWriteCount = 0; // condiviso da tutta l'app, non per board
```

**Deferral indefinito** (`use-realtime-board-sync.ts:64-66`):

```tsx
if (getPendingWriteCount() > 0) {
  scheduleReload(); // ri-schedula a 600ms ogni volta che il contatore è > 0
  return;
}
```

**Gestione manuale fragile** (`rapporto-detail-panel.tsx:929-954`):

```tsx
React.useEffect(() => {
  if (!hadTimer) beginPendingWrite();
  autosaveTimeoutRef.current = window.setTimeout(() => {
    void persistContrattoChangesRef.current().finally(() => endPendingWrite());
  }, 500);
  return () => {
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      endPendingWrite();
    }
  };
}, [editingSection, getChangedContrattoPatch]);
```

L'effect ri-esegue a ogni keystroke perché la dep `getChangedContrattoPatch` cambia identità (riga 922). La sequenza `if (!hadTimer) beginPendingWrite()` + cleanup `endPendingWrite()` può non bilanciarsi → contatore stantio.

#### Blast radius

16 board hook usano `useRealtimeBoardSync`. Tutti condividono lo stesso `pendingWriteCount` globale. Un freeze in un modale di rapporto-detail **congela il realtime su tutta l'app**.

#### Fix proposto dalla sintesi

Corretto. 3 livelli (safety net + auto-reset + rimuovere gestione manuale), con i primi 2 da mergeare prima del 3.

### §4.2 — read-cache TTL 10s ❌ obsoleto (punto contestato)

#### Cosa dice l'audit

> "`anagrafiche-api.ts:382-383` mantiene una read-cache con TTL 10s [...] modifiche di altri utenti invisibili fino a 10 secondi."

#### Razionale tecnico per cui contesto

**Prova 1 — le righe 382-383 non sono una cache.** `anagrafiche-api.ts:378-388`:

```tsx
function normalizeTableResponse<TRecord>(
  response: TableQueryResponse<TRecord>,
): {
  rows: TRecord[];
  total: number;
  columns: TableColumnMeta[];
  groups: TableGroupResult[];
} {
  if (Array.isArray(response)) {
    return { rows: response, total: response.length, columns: [], groups: [] }; // ← righe 382-383
  }
  // ...
}
```

È una funzione che normalizza la forma della response del server. Niente cache, niente TTL.

**Prova 2 — il file dichiara che le shadow cache sono state rimosse.** `anagrafiche-api.ts:399-405`:

```tsx
// Shadow caches removed: 12 in-memory Maps used to wrap fetch helpers were
// sitting in front of React Query and breaking invalidation semantics. When
// React Query invalidated + refetched, the queryFn re-entered the helper,
// hit the Map cache, and returned stale data — visible as "I edited a field
// but the UI doesn't update until I refresh the page" (the cedolino Select
// 'lavorativo'/'festivo' bug). React Query's queryClient is now the single
// source of truth for cache lifecycle.
```

#### Cosa avrebbe valore (marginale)

Il fix proposto avrebbe senso solo per scenari di rinomina label di lookup (raro). Va declassato da P0 a P3.

### §4.3 — Reconnect/resync ✅ vero, P1

#### Razionale tecnico

**Prova 1 — `channel.subscribe()` senza status callback** (`use-realtime-rows.ts:55`).
**Prova 2 — React Query non rinfresca su rete** (`query-client.ts:18-21`).
**Prova 3 — nessun listener `'online'` / `visibilitychange` / `setAuth`** (grep esaustivo).

#### Conseguenza

Dopo: drop di rete temporaneo, sospensione laptop, cambio Wi-Fi, refresh JWT (>1h sessione) → eventi `postgres_changes` persi, mai recuperati. Spiega tutta la classe "serve refresh per vedere i dati".

#### Fix proposto

Corretto. Aggiungere `onStatusChange` a `useRealtimeRows`, trackare lo stato nell'orchestrator, listener `window 'online'`, throttle 5s.

#### Aggiunta non in sintesi

**`realtime.setAuth(token)` su `TOKEN_REFRESHED`** (segnalato da Elon come RT-04). Senza, dopo 1h di sessione i canali smettono di ricevere eventi se la publication ha RLS.

### §4.4 — Echo-window 2,5s globale ✅ vero, minore

`lastLocalWriteAt` è singleton globale → una scrittura su una board sopprime per 2,5s gli eventi su tutte le altre. In pratica edge-case marginale. Si risolve gratis insieme al refactor strutturale di G-009 (per-tabella).

### Frase di sintesi

> "Il finding 'realtime fragile' contiene 4 sotto-problemi. Due sono veri e gravi (G-009 e reconnect), uno è marginale (echo-window), uno è **obsoleto e va eliminato dalla lista** (read-cache TTL 10s). Sul sotto-problema obsoleto contesto con razionale tecnico: le righe 382-383 citate non sono nemmeno una cache, e il file ha un commento esplicito che documenta la rimozione delle 12 shadow cache. Per G-009 propongo refactor strutturale (`pendingWriteCount` per-tabella) invece di stratificare 3 safety-net."

---

## §5 — Finding §1.4: Backlog "✅" inaffidabile

### Setup della verifica

**Fonte di verità:** `ISSUES (4).docx` (268 ticket unici, 169 ✅, 99 aperti).

**Cross-check audit vs ISSUES (4):**

- Agreement (entrambi aperti): 13
- Agreement (entrambi chiusi): 1 (CRM-018, audit REAL_FIX)
- **Conflitti netti** (doc ✅, audit NOT_FIXED/PATCH): **14**
- Pattern doppia-chiusura: 2 (ASS-009, ASN-010)

### Verifica ticket per ticket (in corso)

#### 1. G-008 — Filtri enum con virgola ❌ AUDIT FALSO

- **Audit:** `splitFilterList` mantiene `.split(",")` come fallback.
- **Codice:** fallback esiste, ma il flusso UI principale per enum bypassa la funzione e va via `<Select>`.
- **Verifica utente:** screenshot conferma valore corretto nel dropdown.
- **Verdetto:** falso/obsoleto. Bug utente risolto. Resta solo debito tecnico minore.

#### 2. GT1-001 — Referente idoneità sopra Follow-up ❌ AUDIT FALSO

- **Audit:** "Dentro lo stesso `GateStepSection` con Follow-up".
- **Verifica utente:** screenshot mostra **due sezioni distinte** con header proprio.
- **Verdetto:** falso. L'audit ha interpretato male la struttura.

#### 3. GT1-004 — Badge "Non idoneo" per tutti i Qualificati ❌ AUDIT FALSO (operativamente)

- **Codice:** la riga "Qualificato" è irraggiungibile per ordine degli `if`.
- **Però:** in Gate 1 si filtrano solo "Qualificato" → il badge sarebbe ridondante (stessa scritta su 300 card).
- **Verdetto:** bug logico reale ma operativamente non degrada l'esperienza. Riprogettazione badge è ticket UX a sé.

#### 4. GT1-008 — Filtri base Gate 1 ❌ AUDIT FALSO

- **Codice:** i 3 filtri sono applicati correttamente (disponibilità client-side, stato server-side, non impegnato client+7 query server).
- **Audit:** "non scalabile" — debito tecnico, non bug operativo.
- **Verdetto:** falso ai fini operativi.

#### 5. CED-005 — Bottone "Reset presenze del mese" ✅ AUDIT CORRETTO

- **Codice:** `grep -rn "reset.*presenze\|azzera.*presenze\|Reset presenze\|Ripristina"` → zero risultati.
- **Verdetto:** audit ha ragione 100%. Feature non implementata. Caso "puro" di falso-✅.
- **Da fare:** riaprire e implementare.

#### 6. CED-007 — Codice WebColf label ❌ AUDIT FALSO

- **Codice:** `payroll-overview-view.tsx:854` ha `"Codice Lavoratore Webcolf"` con valore `codice_dipendente_webcolf`.
- **Verdetto:** falso. Il campo è presente. Differenza "Webcolf" vs "WebColf" è scope creep ortografico.

### Verifica residua (10/14 conflitti restanti)

Ticket non ancora verificati: RIC-010, RIC-016, RIC-024, LAV-002, LAV-010, RAP-009, RAP-021, AUT-007 + 2 doppie chiusure (ASS-009, ASN-010).

### Conteggio parziale

- Verificati: 6/14
- **Audit falso: 5** (G-008, GT1-001, GT1-004, GT1-008, CED-007)
- **Audit corretto: 1** (CED-005)
- **Hit rate dell'audit: 17%** sui verificati finora, molto inferiore al 25% dichiarato.

### Frase di sintesi

> "Il finding '25% di ticket falsi-✅' è significativamente sovrastimato sui verificati. Sui primi 6 ticket controllati uno per uno sul codice + UI, l'audit ha ragione su 1 (CED-005, davvero non fatto) e si sbaglia su 5 (per equivoci tecnici, scope creep ortografico, o framing irrilevante operativamente). Hit rate effettivo finora: 17%, non 25%. Il fix operativo è: (a) verificare i 10 ticket residui, (b) sincronizzare `ISSUES (4).docx` con il mio file di lavoro, (c) adottare un gate di chiusura con screenshot per il futuro."

---

## §6 — Domande

### Q1 — Una scelta architetturale che cambierei col senno di poi

Una cosa che, senza dubbio, cambierei è la scelta iniziale di utilizzare direttamente l'edge function per popolare il database. All'inizio era la scelta più logica, ma purtroppo non è stata proficua: abbiamo deciso di partire dalla pagina di anagrafica, che funziona benissimo con l'edge function table query, per i filtri dinamici; le altre pagine, invece, funzionano decisamente meglio utilizzando RPC classiche. Se tornassi indietro, toglierei il table query da tutto il sito, tranne dalla pagina Anagrafiche.
In realtà, mi dà l'idea che anche Anagrafiche non venga utilizzata da nessuno. Probabilmente anche li la cosa migliore sarebbe stato mettere direttamente un MCP di Superbase Conversazionale per raccogliere quei dati. Ci siamo appesantiti il carico, che si è trascinato per il resto del sito, e questa cosa probabilmente non era da fare ma è stata la scelta che in quel momento era la migliore per non scrivere cpoi decine di sql.

La seconda cosa, invece, riguarda gli unit test: li sto facendo soltanto adesso che effettivamente sono molto efficaci (parlo degli unit test e del linting personalizzato) che avrebbero dovuto essere implementati subito. Più che altro, non avendo un ambiente di staging (cosa che è stata largamente sottovalutata dal team), ci impedisce di fare test automatici tipo con playwright direttamente in produzione.

### Q2 — La priorità dei fix proposta dalla sintesi è quella che darei io?

**No, la riordinerei. E va integrata col piano `realtime-bug-class-plan` esistente.**

**Il mio ordine:**

Sicuramente non è l'ordine esatto. Io quello che vorrei finire adesso:

1. gli unitest
2. togliere i table query
3. lavorare effettivamente sui test suggeriti sul blocco del god component e distribuirlo ovunque
   (Sono ottimi suggerimenti e sono validi, quindi successivamente aggiungerei: il context, uno split migliore dei sotto componenti, use memo)

4. Poi, invece, passerei ai fix degli input. Noi abbiamo i sonner, però effettivamente, se a database non viene salvato un record, deve apparire un errore, così almeno non diamo falsi positivi. Questo ci viene gratis, davvero, modificando due righe, quindi, basso effort, alto impatto.
5. anti-freeze + reconnect realtime

### Q3 — Vincolo più grande + 4 settimane

In realtà 4 settimane sono tante. Per quello scritto sopra mi prenderei meno di una settimana. Non c'è veramente un vincolo, se non il fatto che alcune cose per me sono una prima volta, soprattutto sugli unit test. Però l'ordine delle cose che farei è esattamente quello elencato sopra.

## §7 — Contesto importante: il branch `realtime-bug-class-plan`

L'audit non considera (probabilmente non sapeva di) un piano già esistente nel repo: `docs/realtime-bug-class-plan.md` sul branch `realtime-bug-class-plan`. È **fondamentale** averlo presente quando si dimensiona quello che la sintesi propone.

### Status del piano

| Fase           | Status            | Cosa contiene                                                                                                                         |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **FASE 0**     | ✅ done (su main) | Vitest setup + 55 unit test + fix `feeConcordata` + 7 draft guards                                                                    |
| **FASE 1**     | ✅ done           | Infrastruttura test (happy-dom, RTL, helper) — 58 test verdi                                                                          |
| **FASE 2**     | ✅ done           | Test di regressione per ogni bug visto — 72 test                                                                                      |
| **FASE 3**     | ✅ done           | 4 audit + 2 wave di fix → 137 test verdi, classi "fields disappear" + "draft overwritten" + "save bypass" **chiuse retroattivamente** |
| **FASE 4**     | ✅ done           | 4 lint rules che bloccano regressioni — Lefthook pre-push attivo                                                                      |
| **FASE 4 BIS** | 🟡 in corso       | Eliminare `table-query` fuori da `/anagrafiche`                                                                                       |
| **FASE 5**     | ⏸ da fare         | Migrazione progressiva a react-hook-form                                                                                              |
| **FASE 6**     | ⏸ da fare         | Valutazione sync engine (PowerSync/Zero/ElectricSQL)                                                                                  |

### Cosa significa per la sintesi

1. **L'audit dice "0 test"** — falso, ce ne sono 137 sul branch.
2. **L'audit dice "realtime fragile"** — vero, mai bug sono già chiusi da test (echo-suppression, pending-write defer, debounce burst, draft resync, key= pattern).
3. **L'audit dice "25% di ticket ✅ non risolti"** — la FASE 0-3 ha chiuso bug specifici (`feeConcordata`, 7 draft sezioni). Alcuni dei "✅ falsi" che l'audit cita potrebbero essere stati nel frattempo veramente chiusi e l'audit non lo sa.
