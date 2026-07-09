---
title: "feat: sezione «Ricerche coinvolte» in cima al dettaglio lavoratore (BAZ-23)"
type: feat
date: 2026-07-03
linear: BAZ-23
repos: [bazeoffice]
depth: lightweight
---

# feat: sezione «Ricerche coinvolte» in cima al dettaglio lavoratore (BAZ-23)

**Target repo:** `bazeoffice` (percorsi relativi alla radice di `bazeoffice/`).

## Summary

Portare la sezione **«Ricerche coinvolte»** (l'informazione più consultata dai recruiter) in cima al dettaglio del lavoratore, dove oggi è **ultima** e costringe a scorrere. Il riordino riguarda **solo la pagina** `cerca-lavoratori`; il modale del pipeline ricerca è **fuori scope** (vedi «Scope boundaries»). È un riordino puro di JSX/array, senza modifiche di logica, dati o stile.

## Problema

Nella pagina lavoratore la sezione «Ricerche coinvolte» è in fondo (ultima delle ~9 sezioni), mentre è quella più usata → i recruiter scorrono ogni volta. Segnalato da Francesco.

## Requisiti

- **R1** — Nella pagina `cerca-lavoratori`, «Ricerche coinvolte» diventa la **prima sezione di contenuto**, sopra «Residenza». L'header sticky d'identità **«Profilo» resta in cima** (non fa parte della lista scrollabile). Il tab **«Ricerche»** si sposta in prima posizione **dopo** «Profilo» nella tab bar.
- **R2** (invariante) — L'ordine dell'array `workerSectionTabs` deve restare **identico** all'ordine verticale dei blocchi nel DOM: lo scroll-spy dipende da questo (vedi Decisione tecnica).

## Decisione tecnica chiave

Lo scroll-spy della pagina (`syncActiveSection`, `src/components/lavoratori/lavoratori-cerca-view.tsx` ~righe 1503-1531) è **basato su `id`, non su indice**: itera `workerSectionTabs` in ordine e fa `break` alla prima sezione sotto lo scroll. Funziona **solo se l'ordine dei tab combacia con l'ordine verticale dei `<div>` nel DOM**. Quindi il tab «Ricerche» (`id: "processi"`) e il suo blocco JSX vanno spostati **insieme e coerentemente**. Il push condizionale di `non-qualificato` resta invariato: rimane ultimo sia nel DOM sia nell'array → la coerenza è preservata.

Nessun nuovo test: cambiano solo posizione di un blocco JSX e posizione di un elemento in un array literal; nessun ramo logico nuovo. Nessun test esistente asserisce l'ordine né tocca questa view.

## Implementation Units

### U1. Pagina `cerca-lavoratori` — «Ricerche coinvolte» prima sezione + tab

**Goal:** «Ricerche coinvolte» come prima sezione di contenuto e primo tab dopo «Profilo», mantenendo l'invariante R2.

**Requisiti:** R1, R2.

**Files:**
- `src/components/lavoratori/lavoratori-cerca-view.tsx` (modifica)

**Approach:**
1. **Array tab** (`workerSectionTabs`, ~1450-1476): spostare la voce `{ id: "processi", label: "Ricerche", icon: MessageSquareTextIcon }` dal `.push()` finale (~1473) alla **posizione 1 dell'array iniziale**, subito dopo `{ id: "profilo", ... }`. Rimuovere il push finale. Lasciare invariato il push condizionale di `non-qualificato`.
2. **Blocco JSX** (dentro i children di `WorkerDetailShell`, ~1798-2369): spostare l'intero blocco `<div ref={setWorkerSectionRef("processi")}> … </div>` (~2235-2369, `DetailSectionBlock title="Ricerche coinvolte"`) in modo che sia il **primo** figlio del contenitore delle sezioni, **sopra** il blocco `setWorkerSectionRef("residenza")` (~1802). Non toccare il ramo condizionale `non-qualificato`.

Risultato atteso (ordine tab e DOM, identici): `profilo` (sticky), `processi`, `residenza`, `calendario`, `ricerca`, `esperienze`, `competenze`, `documenti`, `non-qualificato`(condizionale, ultimo).

**Patterns to follow:** struttura esistente `<div ref={setWorkerSectionRef(id)}>` per ogni sezione; nessun altro cambiamento.

**Test scenarios:** `Test expectation: none` — riordino puro (JSX + array literal), nessun cambiamento di comportamento; nessuna infrastruttura di test esistente per questa view.

**Verification:** dopo il cambiamento, aprendo un lavoratore la sezione «Ricerche coinvolte» è la prima sotto l'header Profilo; cliccando i tab e scorrendo, l'evidenziazione del tab attivo resta corretta (scroll-spy coerente). Gate verdi: `tsc -b`, `lint`, `test:unit`, `build`.

## Scope boundaries

**In scope:** riordino di posizione della sola sezione «Ricerche coinvolte» nella **pagina** `cerca-lavoratori`.

**Fuori scope / non-goals:** il **modale del pipeline ricerca** (`src/components/ricerca/worker-pipeline-summary-cards.tsx`, `RelatedActiveSearchesBlock`) resta invariato — inizialmente incluso nell'ambito, poi confermato **page-only** dall'utente; nessun cambiamento a contenuto, dati, stile, o al comportamento interno della sezione (tabs interni «Coinvolto direttamente» / «Tutte le altre ricerche», accordion, ecc.); nessun'altra sezione viene riordinata.

## Rischi

- **Rottura dello scroll-spy** se l'ordine dei tab e quello del DOM divergono (R2). Mitigazione: U1 sposta array **e** JSX nella stessa modifica, verificato manualmente scorrendo la pagina.
- Rischio basso e isolato: nessuna logica, nessun consumer esterno, nessun test esistente sull'ordine.
