# FASE 4 BIS — Analisi accurata della migrazione table-query → RPC

> Data: 2026-05-29 · Branch: `realtime-bug-class-plan` (allineato a `main`).
> Basata su: stato REALE del DB (pg_proc) + call site RE-VERIFICATI sul codice
> mergiato (non sul census del 26/05, che resta valido ma con righe sfasate).
> Obiettivo: `table-query` resta SOLO nella pagina Anagrafiche, eliminato altrove.

---

## 0. TL;DR — la sorpresa è positiva

Il census del 26/05 stimava **17 RPC nuove**. Verificando cosa esiste GIÀ sul DB,
il numero crolla: **servono ~4 RPC nuove davvero**, il resto si fa **riusando**
RPC esistenti o **cancellando** codice di fallback.

| Categoria | Call site | Azione | RPC |
|---|---|---|---|
| Lookup per id (famiglie/lavoratori/processi) | ~22 | **3 RPC NUOVE** (trio) | `*_by_ids` |
| Indirizzi per entità | 5 | **1 RPC NUOVA** | `indirizzi_by_entity` |
| Bundle dettaglio rapporto (chiusure/variazioni/contributi/cedolini/ticket) | ~16 | **1 RPC NUOVA** (ricca) | `rapporto_detail` |
| Detail CRM (process+family+address+richiesta) | ~3 | **RIUSO** `crm_pipeline_famiglia_detail` (già esiste) | — |
| Fallback board CRM | 3 | **CANCELLA** (già coperto da `crm_pipeline_famiglie_board`) | — |
| Dropdown ricerca, heuristica nome, groupBy, schema | ~10 | **wave finale, bassa priorità** | piccole RPC o restano |
| Pagina Anagrafiche | tutti | **RESTANO su table-query** (legittimo) | — |

**Stima reale: ~4 RPC nuove + riuso + cancellazioni.** Non 17.

---

## 1. Stato attuale verificato

### 1.1 RPC che ESISTONO già sul DB (15)

Verificate via `pg_proc` il 2026-05-29.

**Board (lista principale di ogni pagina) — 12:**
`gate1_lavoratori`, `gate2_lavoratori`, `cerca_lavoratori`, `ricerca_board`,
`crm_pipeline_famiglie_board`, `rapporti_lavorativi_board`, `cedolini_board`,
`chiusure_board`, `variazioni_board`, `assunzioni_board`, `riattivazioni_board`,
`prove_colloqui_board`.

**Detail (apertura scheda) — 3:**
- `assunzione_detail(p_rapporto_id uuid)` → `{ rapporto, assunzione, lavoratoreAssunzione, richiestaAttivazione }`
- `cedolino_detail(p_id uuid)` → bundle cedolino
- `crm_pipeline_famiglia_detail(p_process_id uuid)` → `{ process, family, address, richiesta_attivazione }`

→ **Le liste board e i 3 detail principali NON usano table-query.** Già a posto.

### 1.2 Cosa usa ANCORA table-query (residuo, fuori Anagrafiche)

Sono **letture secondarie** post-board (arricchimento liste, apertura dettagli,
selezioni correlate). Wrapper coinvolti e n. call site (re-verificati):

| Wrapper | Call site fuori Anagrafiche | Pattern dominante |
|---|---|---|
| `fetchFamiglie` | ~9 | `id IN (...)` (+1 fallback, +2 dropdown/label) |
| `fetchLavoratori` | ~13 | `id IN (...)` / `id =` (+ schema, +search, +label, +list) |
| `fetchProcessiMatching` | ~9 | `id IN (...)` (+2 fallback, +2 dropdown) |
| `fetchIndirizzi` | 6 | `entita_tabella + entita_id IN (...)` (+1 bbox) |
| `fetchSelezioniLavoratori` | 8 | `lavoratore_id` / `id` / composito |
| `fetchRapportiLavorativi` | 5 | `id =` (detail) + 1 bulk board |
| `fetchChiusure/Variazioni/Contributi/Tickets/Mesi*/Pagamenti/Presenze` | ~20 | `rapporto_lavorativo_id =` (sezioni detail rapporto) |
| `fetchRichiesteAttivazione*` | 2 | `processo_res_id IN` / `id IN` |

---

## 2. Analisi di RIUSO (cosa NON va rifatto)

### 2.1 ✅ Detail CRM — già coperto

`crm_pipeline_famiglia_detail(p_process_id)` ritorna già
`{ process, family, address, richiesta_attivazione }`. VERIFICATO nel codice:
- `loadProcessDetail` (use-crm-pipeline-preview.ts:1564) usa **già**
  `fetchCrmPipelineFamigliaDetail` (l'RPC). ✅ CONFERMATO.
- I 3 call site table-query a `:1321/1327/1333` sono dentro
  `fetchBoardRecordsWithTableQueries`, chiamato SOLO nel `catch` a riga 1387 →
  **fallback confermato**. Il census raccomanda di **cancellarlo** (se la board
  RPC è solida, il fallback maschera bug).
- L'unico table-query CRM "live" resta l'address a `:1577`
  (`fetchProcessAddressesByIds`, fallback quando il detail RPC non ha l'id
  indirizzo) → coperto da **Wave 2** (`indirizzi_by_entity`), non CRM-specifico.

**Azione: nessuna RPC nuova per il CRM. Cancellare il fallback board; l'address
residuo cade con Wave 2.**

### 2.2 ⚠️ Detail rapporto — `assunzione_detail` NON basta

`assunzione_detail` ritorna solo `{ rapporto, assunzione, lavoratoreAssunzione, richiestaAttivazione }`.
Il pannello detail rapporto (`use-rapporti-lavorativi-data` + `use-rapporto-related-data`)
carica MOLTO di più: famiglia, lavoratore, processi, **chiusure, variazioni,
contributi, tickets, mesi_lavorati, mesi_calendario, pagamenti, presenze,
richieste_attivazione**.

→ `assunzione_detail` **non è riusabile** per il bundle pieno. Serve una RPC nuova
**più ricca** `rapporto_detail` (mirror dello stesso pattern, ma con
tutte le sezioni). Questa da sola toglie ~16 call site table-query da 2 hook giganti.

### 2.3 ✅ Board già su RPC — niente da fare

Tutte le 12 board RPC esistono e sono usate. I pochi table-query "bulk board"
rimasti (`use-contributi-inps-board.ts` prefetch 3000 righe) sono un caso a parte
(eventuale `contributi_inps_board`, bassa priorità).

---

## 3. RPC NUOVE realmente necessarie

### 🟢 Wave 1 — by_ids trio (file già scritto: `20260529120000_by_ids_trio_rpc.sql`)
1. `lavoratori_by_ids(p_ids uuid[], p_roles text[] default null)` → `setof lavoratori`
2. `famiglie_by_ids(p_ids uuid[])` → `setof famiglie`
3. `processi_matching_by_ids(p_ids uuid[] default null, p_famiglia_ids uuid[] default null)` → `setof processi_matching`

Copre **~22 call site** di lookup puntuale. SQL banale (`where id = any(...)`),
rischio minimo. `tipo_lavoro_domestico` è `text[]` → filtro ruoli con `&&` (verificato).

### 🟢 Wave 2 — indirizzi
4. `indirizzi_by_entity(p_entita_tabella text, p_entita_ids uuid[], p_tipi text[] default null)`
   → righe indirizzo (incl. `provincia_sigla`, lat/lng). Copre **5 call site**.
   (Il bbox geo `indirizzi_in_bbox` è un 5° opzionale, 1 solo caller mappa.)

### 🟢 Wave 3 — bundle rapporto
5. `rapporto_detail(p_rapporto_id uuid, p_sections text[] default null)`
   → `{ rapporto, famiglia, lavoratore, processi, chiusure, variazioni, contributi,
   tickets, mesi, mesi_calendario, pagamenti, presenze, richieste_attivazione }`.
   Copre **~16 call site** da `use-rapporti-lavorativi-data` + `use-rapporto-related-data`.
   La più complessa da scrivere ma altissimo impatto.

### 🟡 Wave 4 — coda a bassa priorità (decidere se vale)
- dropdown search (add-worker/add-search dialog): `*_search_dropdown` ×3
- heuristica per nome (`*_by_name_label`) ×2
- groupBy (`lavoratori_nazionalita_options`)
- gate1 blocking (`gate1_blocking_worker_ids`) — oggi fan-out di 7 query
- selezioni by worker/process/id (`selezioni_*`) ×3
- crm assegnazione board (`crm_assegnazione_board`)
- contributi board prefetch (`contributi_inps_board`)
- **cancellazioni**: fallback CRM (`fetchBoardRecordsWithTableQueries`)
- **resta su TQ o RPC piccola**: schema loader `includeSchema` (use-lavoratori-data)

---

## 4. Cosa RESTA su table-query (esclusione legittima)

- `src/hooks/use-anagrafiche-data.ts`
- `src/components/anagrafiche/anagrafiche-ag-grid.tsx`
- `src/components/anagrafiche/anagrafiche-query-builder.tsx`
- `src/components/anagrafiche/anagrafiche-tables-view.tsx`

La pagina Anagrafiche usa filtri dinamici arbitrari → `table-query` è il suo caso d'uso
giusto. Alla fine: lint rule `no-restricted-imports` che vieta i wrapper table-query
FUORI da questi file.

---

## 5. Ordine consigliato + rischio

| Wave | RPC nuove | Call site tolti | Rischio | Note |
|---|---|---|---|---|
| 1. by_ids trio | 3 | ~22 | **Basso** | SQL triviale, additivo |
| 2. indirizzi | 1 (+1 bbox opz.) | 5 | Basso | un solo predicato |
| 3. rapporto bundle | 1 | ~16 | **Medio** | RPC ricca, tante sezioni; testare bene |
| 4. coda + cancellazioni | ~8 piccole | ~14 | Basso/Medio | opzionale, valutare ROI caso per caso |

**Principio di sicurezza**: ogni RPC è `SECURITY DEFINER` read-only → **stessa
posizione di sicurezza** della edge function `table-query` che sostituisce.
Non cambia nulla sul fronte security (JWT-check resta fuori scope, decisione tua).

**Per board**: dopo ogni swap, smoke test della pagina (la lista carica? il detail
si apre? i dati correlati ci sono?). Niente push finché non confermi.

---

## 6. Decisioni che servono da te

1. **Wave 1 (trio)**: applico io le 3 RPC al DB o le applichi tu? (additive, read-only)
2. **Fallback CRM** (`fetchBoardRecordsWithTableQueries`): lo cancello? È un path
   difensivo; se `crm_pipeline_famiglie_board` è solida, va tolto (maschera bug).
   Decisione di prodotto, non tecnica.
3. **Wave 4**: la facciamo o ci fermiamo dopo Wave 3? Le ~22+5+16 = **43 call site**
   tolti con sole 5 RPC coprono la stragrande maggioranza; la coda è ROI calante.
4. **Schema loader `includeSchema`** (use-lavoratori-data): lo lasciamo su table-query
   come "anagrafiche-adjacent" o RPC dedicata?

---

## 7. Numeri finali

- RPC che esistono già e riuso: **15** (12 board + 3 detail).
- RPC nuove per coprire l'80%+ dei call site residui: **5** (trio + indirizzi + bundle rapporto).
- RPC nuove opzionali (coda): ~8.
- Cancellazioni: 1 fallback (3 call site).
- File che restano su table-query: **4** (pagina Anagrafiche).

> Conclusione: il lavoro è MOLTO più piccolo di quanto sembrasse, perché le board
> e i 3 detail sono già migrati. Con **5 RPC nuove** si toglie table-query da
> ~43 call site su ~57. La coda (Wave 4) è facoltativa.
