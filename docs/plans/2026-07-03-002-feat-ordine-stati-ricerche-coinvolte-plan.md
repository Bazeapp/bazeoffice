---
title: "feat: ordinamento a 3 tier degli stati in «Ricerche coinvolte» (BAZ-24)"
type: feat
date: 2026-07-03
linear: BAZ-24
repos: [bazeoffice]
depth: lightweight
---

# feat: ordinamento a 3 tier degli stati in «Ricerche coinvolte» (BAZ-24)

**Target repo:** `bazeoffice` (percorsi relativi alla radice di `bazeoffice/`).

## Summary

Nella sezione «Ricerche coinvolte» del dettaglio lavoratore (pagina `cerca-lavoratori`), i gruppi di stato (`stato_selezione`) sono renderizzati in **ordine di inserimento dei dati** — così "non selezionato" (bucket enorme) finisce spesso in cima e nasconde i gruppi rilevanti. Ordinare i gruppi con uno schema **a 3 tier semantici**: no-match in cima, stati attivi/aperti al centro (ordine funnel), stati di archivio in fondo. L'ordinamento va applicato a **entrambi i tab** («Coinvolto direttamente» e «Tutte le altre ricerche»).

## Problema

`groupedDirectRelatedSearches` e `groupedOtherRelatedSearches` (`src/components/lavoratori/lavoratori-cerca-view.tsx`, ~righe 602-625) costruiscono i gruppi con una `Map` per `statoSelezione` e ritornano `Array.from(map.entries())` → l'ordine è quello di **prima apparizione nei dati**, non semantico.

## Requisiti

- **R1** — Ordinare i gruppi di stato in `groupedDirectRelatedSearches` **e** `groupedOtherRelatedSearches` secondo lo schema a 3 tier:
  - **Tier 0 (cima):** `no match`.
  - **Tier centrale (funnel):** candidati (`candidato - good fit`, `prospetto`, `candidato - poor fit`) → da colloquiare (`da colloquiare`, `invitato a colloquio`, `non risponde`) → colloqui (`colloquio schedulato/rimandato/fatto`, `prova schedulata/rimandata/in corso/fatta`) → post-colloquio positivi (`selezionato`, `inviato al cliente`, `inviato al cliente in attesa di feedback`, `match`).
  - **Sconosciuti / `Senza stato`:** fine del tier centrale, subito **prima** dell'archivio.
  - **Tier archivio (fondo):** `non selezionato`, `archivio`, `nascosto - oot`.
- **R2** — Il confronto è per **token normalizzato** (minuscole, senza underscore/virgole/trattini/accenti, spazi collassati) — coerente con `normalizeStatusToken`/`normalizeInvolvementToken`. `no match` va valutato **prima** dell'archivio (altrimenti ricadrebbe nel bucket archivio).
- **R3** — Ordinamento **stabile**: stati nello stesso tier mantengono l'ordine corrente (dati). `Array.prototype.sort` è stabile (ES2019+); un comparatore che ritorna `0` a parità di rank preserva l'ordine.

## Decisione tecnica chiave

Estrarre un **modulo puro e testabile** `src/features/ricerca/stati-selezione.ts` (analogo all'esistente `stati-ricerca.ts`) che espone il rank ordinato degli `stato_selezione` e un helper di ordinamento. Riusa la **conoscenza canonica dei macro-gruppi** già presente in `src/hooks/use-ricerca-workers-pipeline.ts` (CANDIDATI/DA_COLLOQUIARE/COLLOQUI/ARCHIVIO) e i token "direct" di `src/features/lavoratori/lib/involvement-utils.ts`, ma **senza** rifattorizzare il pipeline hook a consumarlo (fuori scope, possibile follow-up). Preferito al costante locale nel componente perché è unit-testabile e riusabile.

Ambito **page-only**: verificato che il modale pipeline (`src/components/ricerca/worker-pipeline-summary-cards.tsx`, `RelatedActiveSearchesBlock`) raggruppa per **`statoRicerca`** (stato del processo), un campo diverso da `statoSelezione` → non è la stessa lista e resta fuori scope.

## Implementation Units

### U1. Modulo puro `stati-selezione.ts` + test

**Goal:** una funzione di rank/ordinamento pura per `stato_selezione`, che implementa lo schema a 3 tier.

**Requisiti:** R1, R2, R3.

**Files:**
- `src/features/ricerca/stati-selezione.ts` (nuovo)
- `src/features/ricerca/stati-selezione.test.ts` (nuovo)

**Approach:**
- `normalizeSelectionToken(value)` — mirror di `normalizeStatusToken` (lowercase, rimuove `_`/`,`/`-`/accenti, collassa spazi). Riuso o duplicazione minima; non importare da `use-ricerca-workers-pipeline.ts` (le sue helper sono private e il file è un hook pesante).
- Definire i bucket come **array ordinati di token normalizzati** per tier (Tier 0 no-match → candidati → da colloquiare → colloqui → post-colloquio positivi → [unknown] → archivio). Ordine dei bucket = ordine del rank.
- `getSelectionStateRank(stato): number` — normalizza e ritorna il rank del primo bucket che contiene il token; **`no match` controllato prima dell'archivio**; sconosciuti/`Senza stato` → rank subito prima dell'archivio.
- Esportare un helper di ordinamento stabile su `[groupLabel, items][]` (es. `sortSelectionGroupsByRank(entries)`), che ordina per `getSelectionStateRank(label)` preservando l'ordine a parità.

**Patterns to follow:** struttura di `src/features/ricerca/stati-ricerca.ts` (costanti tipizzate + Set/array esportati); test colocati stile `src/features/lavoratori/lib/*.test.ts` (vitest).

**Test scenarios** (`stati-selezione.test.ts`):
- `no match` ha rank **minore** di ogni altro stato (va in cima), anche se semanticamente è "archivio".
- Stati di archivio (`non selezionato`, `archivio`, `nascosto - oot`) hanno rank **maggiore** di tutti gli stati attivi.
- Ordine funnel nel centro: candidati < da colloquiare < colloqui < post-colloquio (`getSelectionStateRank("prospetto") < getSelectionStateRank("da colloquiare") < getSelectionStateRank("colloquio fatto") < getSelectionStateRank("match")`).
- Stato sconosciuto (es. `"pippo"`) e `Senza stato` → rank tra gli attivi e l'archivio (mai sopra `no match`, mai sotto l'archivio).
- Normalizzazione: `"No_Match"`, `"no  match"`, `"NON SELEZIONATO"` → stesso rank dei rispettivi canonici.
- `sortSelectionGroupsByRank` è **stabile**: due gruppi con lo stesso rank restano nell'ordine di input.

**Verification:** i test coprono i confini dei tier, la normalizzazione e la stabilità; `test:unit` verde.

### U2. Applicare l'ordinamento nel dettaglio lavoratore

**Goal:** ordinare i gruppi renderizzati in «Ricerche coinvolte» con l'helper di U1.

**Requisiti:** R1, R3.

**Dependencies:** U1.

**Files:**
- `src/components/lavoratori/lavoratori-cerca-view.tsx` (modifica)

**Approach:** in `groupedDirectRelatedSearches` e `groupedOtherRelatedSearches` (~righe 602-625), applicare `sortSelectionGroupsByRank(...)` (o `.sort` col comparatore di U1) al risultato `Array.from(groups.entries())` prima di ritornarlo. Nessun'altra modifica (i `defaultValue` degli Accordion derivano già dall'array ordinato).

**Patterns to follow:** i due `useMemo` sono speculari — applicare la stessa modifica a entrambi.

**Test scenarios:** `Test expectation: none` a livello di componente (nessuna infrastruttura di test per questa view; la logica di ordinamento è coperta da U1). Verifica manuale: aprendo un lavoratore con selezioni in vari stati, i gruppi appaiono no-match → attivi → non selezionato/archivio.

**Verification:** `tsc -b` · `lint` · `test:unit` verdi; controllo visivo dell'ordine dei gruppi nei due tab.

## Scope boundaries

**In scope:** ordinamento dei gruppi di `stato_selezione` nei due tab di «Ricerche coinvolte» nella **pagina** `cerca-lavoratori`.

**Fuori scope / non-goals:** il modale pipeline (`worker-pipeline-summary-cards.tsx`) — raggruppa per `statoRicerca` (campo diverso), non è la stessa lista; nessuna modifica al contenuto/UI dei gruppi o dei tab interni; nessuna rifattorizzazione di `use-ricerca-workers-pipeline.ts` per consumare il nuovo modulo (possibile follow-up: unificare la fonte dell'ordine `stato_selezione`).

## Rischi

- **Ordine funnel opinabile** per gli stati "post-colloquio positivi" (selezionato/inviato/match): scelta ragionata dal brainstorm, a basso impatto (sono pochi record e comunque sopra l'archivio). Mitigazione: rank a livello macro-gruppo, ordine intra-tier = ordine dati (stabile).
- **Nuovi `stato_selezione`** non previsti → gestiti dal fallback "sconosciuti prima dell'archivio" (degradazione morbida), coperto da test.
