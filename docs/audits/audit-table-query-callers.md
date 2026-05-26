# Audit: table-query callers outside /anagrafiche

Generated 2026-05-26 on branch `realtime-bug-class-plan`.

Scope: every call site to a `runTableQuery`-backed wrapper in `src/lib/anagrafiche-api.ts` outside the legitimate Anagrafiche page (`use-anagrafiche-data.ts` + `src/components/anagrafiche/**`) and outside test files. Goal: define the dedicated RPCs needed to retire `table-query` for the rest of the app.

## Summary

- Total call sites scanned (grep matches outside exclusion list): ~75 import + invocation lines, **57 distinct invocations**.
- Outside-anagrafiche files touched: **15**.
- Unique RPC candidates proposed: **17** (plus 1 RPC already exists for one shape and 1 RPC that is genuinely board-level and already exists — flagged "REUSE").
- Estimated migration effort (rough): **5–8 days** of focused work (design + write + deploy + per-call-site swap + smoke test), assuming the existing convention of one SQL function per shape with light JSON return.

Notes on classification:
- Most call sites are **"by id" / "by ids[]"** point lookups for `famiglie`, `lavoratori`, `processi_matching`, `selezioni_lavoratori`, `indirizzi` (huge concentration). These collapse into a handful of generic-but-typed `*_by_ids_v1` RPCs.
- A handful of call sites are **"by foreign-key"** loaders for `rapporto_lavorativo_id` (contributi/mesi/variazioni/pagamenti/presenze/tickets) used by `use-rapporto-related-data.ts` + `use-rapporti-lavorativi-data.ts`. These collapse into one fat RPC `rapporto_related_bundle_v1` (or two: detail-eager + on-demand).
- A few are **search/listing** shapes (`fetchLavoratori` with search/orderBy/filters, fallback in CRM pipeline preview, contributi-inps board prefetch). Each needs its own narrow RPC.

## Call sites by wrapper

### `fetchLavoratori` (12 outside Anagrafiche)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/ricerca/ricerca-workers-map-view.tsx:503 | ricerca map discovery | 16 cols (id, nome, cognome, email, telefono, foto, check_blacklist, stato_lavoratore, disponibilita, data_ritorno_disponibilita, tipo_lavoro_domestico, tipo_rapporto_lavorativo, data_di_nascita, anni_esperienza_colf, anni_esperienza_babysitter, cap, check_lavori_accettabili) | `id IN (batch)` + optional `tipo_lavoro_domestico has_any (roles)` | list (batched) | Discover workers near a geo bbox by id list |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:1382 | pipeline detail | `*` (default) | `id = workerId` | single | Selected worker detail in pipeline |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:1872 | pipeline AI summary refetch | `*` | `id = workerId` | single | Refresh worker row after AI summary |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:2093 | add-worker dialog | id, nome, cognome, email, data_di_nascita, provincia | `search` (nome/cognome/email) | list (max 25) | Search lavoratori for "add worker" dialog |
| src/components/lavoratori/lavoratori-cerca-view.tsx:1193 | cerca AI summary refetch | `*` | `id = workerId` | single | Same as pipeline AI summary |
| src/hooks/use-lavoratori-data.ts:523 | nazionalita options | `nazionalita` + `groupBy: nazionalita` | none | groupBy aggregation | Build filter options |
| src/hooks/use-lavoratori-data.ts:1308 | schema loader | `id` + `includeSchema` | none | schema only | Load columns metadata for filter UI |
| src/hooks/use-lavoratori-data.ts:1433 | gate1 schema loader | `id` + `includeSchema` | gate1 base filter | schema only | Same, scoped |
| src/hooks/use-lavoratori-data.ts:1508 | gate1 fallback non-RPC path | `WORKER_LIST_SELECT` | gate1 base filter + search/sort | paginated list | Fallback when `fetchGate1Lavoratori` RPC unusable |
| src/hooks/use-lavoratori-data.ts:1725 | main list non-Gate1 | `WORKER_LIST_SELECT` | user filters + search/sort | paginated list | Cerca page main list when not using Gate1 RPC |
| src/hooks/use-lavoratori-data.ts:1872 | selected worker detail | `WORKER_DETAIL_SELECT` | `id = workerId` | single | Detail panel content |
| src/hooks/use-rapporti-lavorativi-data.ts:298 | unique by label fallback | `*` | name parts (`or` of `nome` contains / `cognome` contains, etc.) | up to 2 | Heuristic lavoratore lookup by display name |
| src/hooks/use-rapporti-lavorativi-data.ts:630 | rapporto related | `*` | `id = lavoratore_id` | single | Famiglia/Lavoratore panel for rapporto detail |
| src/hooks/use-rapporto-related-data.ts:192 | rapporto related (older hook) | `*` | `id = lavoratore_id` | single | Same |

### `fetchFamiglie` (10)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/ricerca/ricerca-detail-view.tsx:942 | ricerca detail | `*` | `id = famigliaId` | single | Family card on Ricerca detail |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:546 | pipeline related families | `*` | `id IN (batch)` | list (batched) | Family for related selections |
| src/components/lavoratori/lavoratori-cerca-view.tsx:324 | cerca related families | `*` | `id IN (batch)` | list (batched) | Same shape, lavoratori page |
| src/components/lavoratori/lavoratori-cerca-view.tsx:373 | add-search dialog | id, nome, cognome, email, customer_email, secondary_email, telefono | `search` (nome/cognome/email/...) | list (max 10) | Family search to attach process to worker |
| src/hooks/use-rapporti-lavorativi-data.ts:290 | unique by label | `*` | name-parts filter | up to 2 | Heuristic famiglia by display name |
| src/hooks/use-rapporti-lavorativi-data.ts:623 | rapporto detail famiglia | `*` | `id = famiglia_id` | single | Same as ricerca-detail |
| src/hooks/use-rapporti-lavorativi-data.ts:668 | rapporto detail famiglia fallback | `*` | `id IN (fallbackFamigliaIds)` | up to 1 | Fallback via process famiglia_ids |
| src/hooks/use-rapporto-related-data.ts:185 | rapporto detail famiglia (older hook) | `*` | `id = famiglia_id` | single | Same |
| src/hooks/use-crm-assegnazione.ts:307 | crm assegnazione | `ASSEGNAZIONE_FAMIGLIE_SELECT` | `id IN (famigliaIds)` | list | Assegnazione board families |
| src/hooks/use-crm-pipeline-preview.ts:1327 | crm pipeline FALLBACK | `CRM_PIPELINE_FAMIGLIE_SELECT` | none + limit | list | Only hit when `crm_pipeline_famiglie_board` RPC fails — leave or remove with the fallback |
| src/hooks/use-lavoratori-data.ts:1026 | lavoratori related families | id, nome, cognome | `id IN (batch)` | list (batched) | Display name for related selections |

### `fetchIndirizzi` (7)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/ricerca/ricerca-detail-view.tsx:965 | ricerca detail | 12 cols incl `provincia_sigla`, `latitudine`, `longitudine` | `entita_tabella = processi_matching` AND `entita_id = currentProcessId` AND `tipo_indirizzo IN (luogo,prova)` | up to 3 | Address card on Ricerca detail |
| src/components/ricerca/ricerca-workers-map-view.tsx:411 | discovery map | `entita_id, tipo_indirizzo, cap, citta, note, lat, lng` | `entita_tabella = lavoratori` AND lat/lng between bbox | paginated | Discovery by geo radius |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:1422 | pipeline detail worker addr | id, tipo_indirizzo, via, civico, cap, citta, provincia, paese, citofono, note, indirizzo_formattato | `entita_tabella = lavoratori` AND `entita_id = workerId` | up to 3 | Worker address card |
| src/hooks/use-ricerca-workers-pipeline.ts:699 | pipeline worker addresses batch | 11 cols incl lat/lng + provincia | `entita_tabella = lavoratori` AND `entita_id IN (batch)` | list (batched) | Addresses for visible workers |
| src/hooks/use-lavoratori-data.ts:782 | lavoratori list addresses | 11 cols incl `provincia_sigla` | `entita_tabella = lavoratori` AND `entita_id IN (batch)` | paginated, batched | Per-row address chips |
| src/hooks/use-crm-pipeline-preview.ts:617 | crm pipeline addresses | `CRM_PIPELINE_ADDRESS_SELECT` | `entita_tabella = processi_matching` AND `entita_id IN (batch)` | list (batched) | Used both by fallback AND by `loadProcessDetail` (line 1577) |

### `fetchProcessiMatching` (9)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/ricerca/ricerca-detail-view.tsx:905 | ricerca detail | `*` | `id = currentProcessId` | single | Full process row for detail |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:508 | pipeline related processes | `*` | `id IN (batch)` | list | Process cards behind related selections |
| src/components/lavoratori/lavoratori-cerca-view.tsx:286 | cerca related processes | `*` | `id IN (batch)` | list | Same shape, lavoratori page |
| src/components/lavoratori/lavoratori-cerca-view.tsx:427 | add-search dialog (via family) | `processSelect` (13 cols) | `famiglia_id` OR-of-IN | list (max 25) | Find processes by candidate families |
| src/components/lavoratori/lavoratori-cerca-view.tsx:444 | add-search dialog (direct) | same select | `search` (id, stato_res, orario) | list (max 12) | Direct process search |
| src/hooks/use-lavoratori-data.ts:981 | lavoratori related processes | 11 cols (incl `indirizzo_prova_*`, `recruiter_*`, `stato_res`) | `id IN (batch)` | list (batched) | Related selections enrichment |
| src/hooks/use-rapporti-lavorativi-data.ts:637 | rapporto detail processes | `*` | `id IN (rapporto.processIds)` | list (≤10) | Process list for rapporto |
| src/hooks/use-rapporto-related-data.ts:199 | rapporto detail processes (older) | `*` | same | list | Same |
| src/hooks/use-crm-assegnazione.ts:274 | crm assegnazione | `ASSEGNAZIONE_PROCESSI_SELECT` | `stato_res IN (da assegnare, fare ricerca, ...)` | list | Assegnazione board processes |
| src/hooks/use-crm-pipeline-preview.ts:1321 | crm pipeline FALLBACK | `CRM_PIPELINE_PROCESSI_SELECT` | none + order desc | list | Fallback path |
| src/hooks/use-crm-pipeline-preview.ts:1333 | crm pipeline stage counts | `stato_sales` + `groupBy: stato_sales` | none | groupBy aggregation | Fallback stage counts |

### `fetchSelezioniLavoratori` (8)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:465 | pipeline related selections | `*` | `lavoratore_id = workerId` | paginated | Other active selections for worker (pipeline) |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:1404 | pipeline selected selection | `*` | `id = selectionId` | single | Selection detail in side panel |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:1921 | pipeline AI feedback refetch | `*` | `id = selectedCard.id` | single | Reload after AI message generation |
| src/components/ricerca/ricerca-workers-pipeline-view.tsx:2194 | pipeline duplicate check | `id` | `processo_matching_id = X AND lavoratore_id = Y` | up to 1 | Duplicate-check before insert |
| src/components/lavoratori/lavoratori-cerca-view.tsx:243 | cerca related selections | `*` | `lavoratore_id = workerId` | paginated | Same shape, lavoratori page |
| src/components/lavoratori/lavoratori-cerca-view.tsx:1245 | cerca duplicate check | id, stato_selezione, processo_matching_id | same composite | up to 1 | Same |
| src/hooks/use-ricerca-workers-pipeline.ts:622 | pipeline list by process | `PIPELINE_SELECTIONS_SELECT` | `processo_matching_id = processId` | paginated | All selections for the current ricerca |
| src/hooks/use-lavoratori-data.ts:854 | gate1/related selections by workers | 7 cols (id, lavoratore_id, processo_matching_id, stato_selezione, stato_situazione_lavorativa, note_selezione, aggiornato_il) | `lavoratore_id IN (batch)` (+ optional `stato_selezione IN (blocking)`) | paginated, batched | Related-selections sidebar + gate1 blocking |
| src/hooks/use-lavoratori-data.ts:940 | gate1 blocking workers | `lavoratore_id, stato_selezione` | `stato_selezione = each blocking status` (fan-out) | paginated | Build set of workers blocked at gate1 |

### `fetchRapportiLavorativi` (5)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/gestione-contrattuale/chiusure-board-view.tsx:813 | chiusure detail | `*` | `id = rapporto.id` | single | Detail card rapporto |
| src/components/gestione-contrattuale/variazioni-board-view.tsx:1143 | variazioni detail | `*` | `id = rapporto.id` | single | Same |
| src/components/payroll/contributi-inps-view.tsx:723 | contributi detail | `*` | `id = rapportoId` | single | Same |
| src/hooks/use-rapporti-lavorativi-data.ts:504 | rapporto board detail | `*` | `id = selectedRapportoId` | single | Detail panel main rapporto |
| src/hooks/use-contributi-inps-board.ts:466 | contributi board | `CONTRIBUTI_RAPPORTI_SELECT` | none + order desc, limit 3000 | bulk list | Pre-fetch all rapporti for joining |

### `fetchChiusureContratti` (3)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/gestione-contrattuale/chiusure-board-view.tsx:794 | chiusure detail | `*` | `id = currentCardId` | single | Detail card refresh |
| src/hooks/use-rapporti-lavorativi-data.ts:644 | rapporto detail chiusura | `*` | `id = fine_rapporto_lavorativo_id` | up to 1 | Chiusura linked to rapporto |
| src/hooks/use-rapporto-related-data.ts:224 | same | `*` | same | up to 1 | Same |

### `fetchVariazioniContrattuali` (3)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/gestione-contrattuale/variazioni-board-view.tsx:1124 | variazioni detail | `*` | `id = currentCardId` | single | Detail refresh |
| src/hooks/use-rapporti-lavorativi-data.ts:758 | rapporto detail variazioni | `*` | `rapporto_lavorativo_id = X` | list (≤200) | Variazioni section |
| src/hooks/use-rapporto-related-data.ts:217 | same | `*` | same | list | Same |

### `fetchContributiInps` (4)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/components/payroll/contributi-inps-view.tsx:696 | contributi detail | `*` | `id = currentCardId` | single | Detail refresh |
| src/hooks/use-contributi-inps-board.ts:454 | contributi board | `CONTRIBUTI_SELECT` | quarter range filter | bulk list (3000) | Board cards source |
| src/hooks/use-rapporti-lavorativi-data.ts:747 | rapporto detail contributi | `*` | `rapporto_lavorativo_id = X` | list (≤200) | Contributi section |
| src/hooks/use-rapporto-related-data.ts:205 | same | `*` | same | list | Same |

### `fetchTickets` (1)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/hooks/use-rapporti-lavorativi-data.ts:736 | rapporto detail tickets | `*` | `rapporto_id = X` | list (≤100) | Tickets section |

### `fetchTransazioniFinanziarie`

No callers found outside Anagrafiche page. STAYS in `table-query`-only mode if used by Anagrafiche; otherwise dead.

### `fetchRichiesteAttivazione` (2)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/features/richieste-attivazione/api.ts:78 | fetchRichiesteAttivazioneByProcessIds | RICHIESTE_ATTIVAZIONE_SELECT (8 cols) | `processo_res_id IN (batch)` | list (batched, dedup latest) | Used by both rapporti-data + rapporto-related-data |
| src/features/richieste-attivazione/api.ts:106 | fetchRichiesteAttivazioneByIds | same | `id IN (batch)` | list (batched) | by id lookup |

### `fetchMesiLavorati` (2)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/hooks/use-rapporti-lavorativi-data.ts:769 | cedolini section | `*` | `rapporto_lavorativo_id = X` | list (≤500) | Cedolini for rapporto |
| src/hooks/use-rapporto-related-data.ts:211 | same | `*` | same | list | Same |

### `fetchMesiCalendario` (3)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/hooks/use-rapporti-lavorativi-data.ts:790 | cedolini-by-id enrichment | `*` | `id IN (meseIds)` | list (≤200) | Mese calendar enrichment |
| src/hooks/use-rapporto-related-data.ts:247 | same | `*` | same | list | Same |
| src/hooks/use-contributi-inps-board.ts:461 | contributi board | `*` | none, limit 500 | bulk list | Quarter index for contributi |

### `fetchPagamenti` (2)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/hooks/use-rapporti-lavorativi-data.ts:798 | cedolini section | `*` | `ticket_id IN (ids)` | list (≤500) | Pagamenti for cedolini |
| src/hooks/use-rapporto-related-data.ts:255 | same | `*` | same | list | Same |

### `fetchPresenzeMensili` (2)

| File:line | Hook/Component | SELECT | Filter pattern | Cardinality | Purpose |
|---|---|---|---|---|---|
| src/hooks/use-rapporti-lavorativi-data.ts:806 | cedolini section | `*` | `id IN (presenzaIds)` | list (≤500) | Presenze for cedolini |
| src/hooks/use-rapporto-related-data.ts:263 | same | `*` | same | list | Same |

## Wrappers with no callers outside Anagrafiche

- `fetchTransazioniFinanziarie` — STAYS (Anagrafiche-only based on grep).
- `fetchAssunzioni` — STAYS / unused outside (Assunzioni board uses `assunzioni_board` RPC).

## Proposed RPCs

> Naming follows `<entita>_<scopo>_v1`. Returns are JSON-shaped consistently (`{ rows, total? }` or single object). Most callers want **typed rows**, not the full schema columns array — so RPCs do not need `includeSchema`. The only schema-load call sites (use-lavoratori-data.ts:1308, :1433) can keep `fetchLavoratori(includeSchema)` as a one-off **Anagrafiche-leakage** that we can either keep under table-query or expose via `lavoratori_filter_schema_v1`.

### 1. `lavoratori_by_ids_v1`
- **Replaces**:
  - ricerca-workers-pipeline-view.tsx:1382, :1872
  - lavoratori-cerca-view.tsx:1193
  - use-lavoratori-data.ts:1872
  - use-rapporti-lavorativi-data.ts:630
  - use-rapporto-related-data.ts:192
  - use-ricerca-workers-pipeline.ts:663 (batched)
  - ricerca-workers-map-view.tsx:503 (with optional role filter)
- **Params**: `(p_ids uuid[], p_roles text[] default null)` — `p_roles` applies `tipo_lavoro_domestico ?| p_roles` when non-null.
- **Returns**: `setof lavoratori` (the full row used by detail panels).
- **Why dedicated**: 7+ callers all do the same `id IN (...)` lookup, differ only in batch size and optional role filter. Single RPC kills the most-frequent table-query pattern.

### 2. `lavoratori_search_dropdown_v1`
- **Replaces**: ricerca-workers-pipeline-view.tsx:2093 (add-worker dialog).
- **Params**: `(p_search text, p_limit int default 30)`.
- **Returns**: rows with `id, nome, cognome, email, data_di_nascita, provincia`.
- **Why dedicated**: thin search-only shape on a hot dialog; collapses two server hits into one and keeps the SELECT explicit.

### 3. `lavoratore_by_name_label_v1`
- **Replaces**: use-rapporti-lavorativi-data.ts:298.
- **Params**: `(p_label text)`.
- **Returns**: at most one `lavoratori` row matching label heuristic.
- **Why dedicated**: heuristic OR-of-contains is awkward and not reused — encapsulate the rule in SQL.

### 4. `lavoratori_nazionalita_options_v1`
- **Replaces**: use-lavoratori-data.ts:523.
- **Params**: none.
- **Returns**: `[{ value, label, count }]`.
- **Why dedicated**: the only `groupBy` use on lavoratori, used for filter dropdown.

### 5. `famiglie_by_ids_v1`
- **Replaces**:
  - ricerca-detail-view.tsx:942
  - ricerca-workers-pipeline-view.tsx:546
  - lavoratori-cerca-view.tsx:324
  - use-rapporti-lavorativi-data.ts:623, :668
  - use-rapporto-related-data.ts:185
  - use-crm-assegnazione.ts:307
  - use-lavoratori-data.ts:1026 (only needs `id, nome, cognome` — accept `p_columns` mode or always return same shape)
- **Params**: `(p_ids uuid[])`.
- **Returns**: `setof famiglie` (full row; trim client-side for tiny lookups).
- **Why dedicated**: most reused shape in the codebase. 8 callers, same filter, same purpose.

### 6. `famiglie_search_dropdown_v1`
- **Replaces**: lavoratori-cerca-view.tsx:373.
- **Params**: `(p_search text, p_limit int default 10)`.
- **Returns**: `id, nome, cognome, email, customer_email, secondary_email, telefono`.
- **Why dedicated**: dialog-only, narrow SELECT, distinct from id-lookup.

### 7. `famiglia_by_name_label_v1`
- **Replaces**: use-rapporti-lavorativi-data.ts:290.
- **Params**: `(p_label text)`.
- **Returns**: at most one famiglia row.
- **Why dedicated**: mirror of #3.

### 8. `indirizzi_by_entity_v1`
- **Replaces**:
  - ricerca-detail-view.tsx:965 (process)
  - ricerca-workers-pipeline-view.tsx:1422 (lavoratori)
  - use-ricerca-workers-pipeline.ts:699 (batched lavoratori)
  - use-lavoratori-data.ts:782 (batched lavoratori)
  - use-crm-pipeline-preview.ts:617 + loadProcessDetail at line 1577 (process)
- **Params**: `(p_entita_tabella text, p_entita_ids uuid[], p_tipi text[] default null)`.
- **Returns**: rows shaped as `{ id, entita_id, tipo_indirizzo, via, civico, cap, citta, provincia, provincia_sigla, paese, citofono, indirizzo_formattato, note, latitudine, longitudine }`.
- **Why dedicated**: 5 callers, same `entita_tabella + entita_id IN ...` predicate. Differ only in optional tipo filter.

### 9. `indirizzi_in_bbox_v1`
- **Replaces**: ricerca-workers-map-view.tsx:411.
- **Params**: `(p_min_lat, p_max_lat, p_min_lng, p_max_lng, p_limit, p_offset)`.
- **Returns**: same address shape as #8.
- **Why dedicated**: only geo-bbox caller; would be ugly to overload #8.

### 10. `processi_matching_by_ids_v1`
- **Replaces**:
  - ricerca-detail-view.tsx:905
  - ricerca-workers-pipeline-view.tsx:508
  - lavoratori-cerca-view.tsx:286
  - lavoratori-cerca-view.tsx:427 (by `famiglia_id IN (...)` — extend params)
  - use-lavoratori-data.ts:981
  - use-rapporti-lavorativi-data.ts:637
  - use-rapporto-related-data.ts:199
- **Params**: `(p_ids uuid[] default null, p_famiglia_ids uuid[] default null)` — apply whichever is non-null.
- **Returns**: `setof processi_matching`.
- **Why dedicated**: 7 callers; small variation in SELECT (mostly `*` or a thin column list — return full row).

### 11. `processi_matching_search_dropdown_v1`
- **Replaces**: lavoratori-cerca-view.tsx:444.
- **Params**: `(p_search text, p_limit int)`.
- **Returns**: thin process row (13 cols).
- **Why dedicated**: search-only.

### 12. `crm_assegnazione_processi_v1`
- **Replaces**: use-crm-assegnazione.ts:274 (+ the famiglia hop becomes #5).
- **Params**: none (status list hardcoded in RPC) or `(p_statuses text[])`.
- **Returns**: process rows + (optionally) bundled famiglie. Could be wrapped into `crm_assegnazione_board_v1` to return both at once (mirror of `crm_pipeline_famiglie_board`).
- **Why dedicated**: distinct page; sibling of the existing `crm_pipeline_famiglie_board` pattern.

### 13. `selezioni_lavoratori_by_worker_v1`
- **Replaces**:
  - ricerca-workers-pipeline-view.tsx:465
  - lavoratori-cerca-view.tsx:243
  - use-lavoratori-data.ts:854 (multi-worker batched)
- **Params**: `(p_worker_ids uuid[], p_blocking_only boolean default false, p_select_columns text[] default null)` — or just always return full row.
- **Returns**: selection rows.
- **Why dedicated**: 3 callers, same FK predicate. Note: an RPC `ricerca_worker_related_selection_summaries` already exists but only returns counts — this one returns the actual rows for sidebar enrichment.

### 14. `selezioni_lavoratori_by_process_v1`
- **Replaces**: use-ricerca-workers-pipeline.ts:622.
- **Params**: `(p_process_id uuid)`.
- **Returns**: full selection rows (no pagination — current code already loops fully).
- **Why dedicated**: distinct predicate from #13.

### 15. `selezione_lavoratore_by_id_v1`
- **Replaces**:
  - ricerca-workers-pipeline-view.tsx:1404, :1921
  - duplicate-check at ricerca-workers-pipeline-view.tsx:2194 (composite predicate)
  - duplicate-check at lavoratori-cerca-view.tsx:1245
- **Params**: `(p_id uuid default null, p_process_id uuid default null, p_lavoratore_id uuid default null)` — either by id or by `(process,lavoratore)` composite.
- **Returns**: at most one row.
- **Why dedicated**: 4 callers, 2 distinct shapes — collapse into one RPC with optional params.

### 16. `gate1_blocking_worker_ids_v1`
- **Replaces**: use-lavoratori-data.ts:940 (the 7-status fan-out).
- **Params**: none.
- **Returns**: `uuid[]` (or `setof uuid`).
- **Why dedicated**: today fan-outs into 7 parallel `table-query` calls just to compute a set. SQL can compute in one shot with the proper status taxonomy.

### 17. `rapporto_detail_bundle_v1`
- **Replaces** (eager bundle): in `use-rapporti-lavorativi-data.ts` and `use-rapporto-related-data.ts`:
  - fetchRapportiLavorativi (504) — already covered by `rapporti_lavorativi_board` for list, but detail-by-id is separate; could be merged here
  - fetchChiusureContratti (644 / 224)
  - fetchVariazioniContrattuali (758 / 217)
  - fetchContributiInps (747 / 205)
  - fetchTickets (736)
  - fetchMesiLavorati (769 / 211) + fetchMesiCalendario (790 / 247) + fetchPagamenti (798 / 255) + fetchPresenzeMensili (806 / 263)
- **Params**: `(p_rapporto_id uuid, p_sections text[] default null)` — null means everything; section-list lets the on-demand `ensureRelatedSectionLoaded` path request a subset.
- **Returns**: `{ rapporto, famiglia, lavoratore, processi, chiusure, variazioni, contributi, tickets, mesi, mesi_calendario, pagamenti, presenze, richieste_attivazione }`.
- **Why dedicated**: this is the single largest cluster of related-loads in the app (≈12 wrappers in one effect). Mirror of `cedolini_detail` and `crm_pipeline_famiglia_detail` patterns. Subsumes Tickets/Contributi/Variazioni single-FK loaders entirely.

### Auxiliary: chiusure / variazioni / contributi single-card detail

The chiusure-board-view, variazioni-board-view, contributi-inps-view all use the same "refresh selected card" two-call pattern (`fetch<entity>(id)` + `fetchRapportiLavorativi(id)`). These can be served by tiny RPCs:

- `chiusura_contratto_detail_v1(p_id uuid)` → `{ record, rapporto }`
- `variazione_contrattuale_detail_v1(p_id uuid)` → same
- `contributo_inps_detail_v1(p_id uuid)` → same

(Each replaces 2 call sites.) Alternatively all three boards could share a single `<board>_card_detail_v1` once we have `cedolini_detail` style coverage.

### Auxiliary: contributi board prefetch

The contributi-inps-board hook bulk-fetches 3000 contributi + 500 mesi_calendario + 3000 rapporti. This already smells like a board RPC — propose `contributi_inps_board_v1(p_year int, p_quarter text)` returning `{ stages, cards, active_rapporti_count }` analogous to `cedolini_board`.

### Auxiliary: crm pipeline fallback path

`fetchBoardRecordsWithTableQueries` (use-crm-pipeline-preview.ts:1319) is a **fallback** when the existing `crm_pipeline_famiglie_board` RPC fails. Recommended action: **delete the fallback** rather than build new RPCs for it. If the RPC is robust enough for production, the fallback only masks bugs.

### Auxiliary: richieste_attivazione lookup

`fetchRichiesteAttivazioneByProcessIds` + `ByIds` could be served by:
- `richieste_attivazione_by_process_ids_v1(p_process_ids uuid[])` → already returns latest-per-process (dedup currently happens client-side; move into SQL with `distinct on`).
- `richieste_attivazione_by_ids_v1(p_ids uuid[])`.

Or: leave wrapped in `table-query` if low priority — they ARE in a feature folder (`src/features/richieste-attivazione/`) but the SELECT/filter is simple enough to migrate cheaply.

### Schema-loading edge case

`use-lavoratori-data.ts:1308 + :1433` only call `fetchLavoratori` to extract the `columns` schema for the advanced-filter UI. Two options:
- Drop schema loading entirely (we already know the lavoratori columns).
- Add `lavoratori_filter_schema_v1()` returning the typed column list once.

## Migration ordering recommendation

Prioritized by **reach × simplicity** (most callers fixed for least SQL):

1. **`famiglie_by_ids_v1` + `lavoratori_by_ids_v1` + `processi_matching_by_ids_v1`** — together remove ~22 call sites with three trivial SQL functions (just `select ... where id = any(p_ids)`). Lowest risk, highest reach. Build all three together as a "by_ids trio" PR.
2. **`indirizzi_by_entity_v1`** — single predicate (`entita_tabella + entita_id IN ...`), removes 5 call sites including the heaviest worker-address batches.
3. **`rapporto_detail_bundle_v1`** — removes ~10 wrappers from two big hooks in one go, normalizes the rapporto detail loader pattern, kills the entire FK-by-rapporto load family.

Everything else (`gate1_blocking_worker_ids_v1`, dropdown searches, single-card details, contributi board, label-heuristics, bbox geo) can land in a second wave once the by_ids backbone is in place — most of them depend only on one or two call sites each.

## Open uncertainties

- The CRM pipeline fallback (`fetchBoardRecordsWithTableQueries`) is a defensive code path; deciding whether to delete it vs. cover with RPCs is a product call, not a technical one.
- The `includeSchema` use cases in `use-lavoratori-data.ts` are arguably an Anagrafiche-style legitimate generic-query — but the file is NOT in the exclusion list, so flagged UNCERTAIN. Likely outcome: small dedicated RPC or remove altogether.
- `fetchRichiesteAttivazioneByProcessIds` lives under `src/features/`; whether it is considered "anagrafiche-adjacent" or production code is unclear — treated as outside-anagrafiche here.
