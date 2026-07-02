# Realtime Board Pattern

Guida per gli hook board (`use-*-board.ts`, `use-*-data.ts`, `use-*-pipeline.ts`,
`use-crm-*.ts`) che usano `useRealtimeBoardSync`. Documenta la classe di bug
"i campi della scheda detail spariscono / restano stantii quando un altro
utente modifica il record da un'altra scheda" e i due fix template che
risolvono i casi.

## Quando un board è vulnerabile

Servono tutti e tre questi ingredienti contemporaneamente:

1. Una `useQuery` (o stato React) che popola il board con un SELECT
   **ristretto** sui campi della card preview.
2. Un detail loader **separato** che carica più colonne (es. RPC `*_detail`,
   `fetch*ById`, `loadSelectedXxx`).
3. Il detail e il board **condividono stato** — direttamente (stesso
   `queryKey` con `setQueryData`) o indirettamente (effect che ri-popola
   uno stato React derivato dal board).

Se uno dei tre manca, il board è sano. Esempi:
- `use-chiusure-board`: niente detail loader separato → non vulnerabile.
- `use-ricerca-workers-pipeline`: detail letto direttamente dai dati del
  board, niente SELECT divergente → non vulnerabile.

## I due pattern di fix

### Pattern A — Merge preservante (board e detail condividono cache)

Caso tipico: `use-crm-pipeline-preview`. Il detail scrive in
`setQueryData(boardQueryKey)`. Il board refetch ricostruisce le card e
cancella i campi che il board RPC non restituisce.

Fix in 3 punti:

1. Tabelle di binding `(colonnaDB → campoCard)` per ciascuna sorgente
   (process, family, address, …).
2. La funzione `mapXxxData(...)` accetta un parametro opzionale
   `previousCard?: XxxCardData`. Dopo aver costruito la card nuova, per
   ogni binding: se la colonna sorgente **non è presente** nel payload
   fresco, ripristina il valore dalla `previousCard`. Se la colonna è
   presente (anche se `null`), vince il valore fresco.
3. Nel `queryFn`, passa una closure `getPreviousCard(id)` che legge
   `queryClient.getQueryData(boardQueryKey)` **al momento del mapping**
   (non all'inizio del queryFn). Questo evita la race con un eventuale
   `setQueryData` concorrente di un detail loader che è arrivato per
   primo.

Vedi `src/modules/crm/hooks/use-crm-pipeline-preview.ts` come riferimento:
- `PROCESS_FIELD_BINDINGS` / `FAMILY_FIELD_BINDINGS` / `ADDRESS_FIELD_BINDINGS`
- `preserveMissingFields(card, previous, row, bindings)`
- `getPreviousCard` callback nel `queryFn`

### Pattern B — Trigger su realtime tick (detail in stato separato)

Caso tipico: `use-lavoratori-data`. Il detail vive in stato React
indipendente (`selectedWorkerRow`, `selectedWorkerExtras`,
`selectedWorkerAddress`). Il board refetch non lo tocca, ma neanche lo
rinfresca dopo una modifica remota.

Fix: aggiungere `realtimeTick` ai deps di tutti gli `useEffect` che
caricano detail per il record selezionato. Il `realtimeTick` viene
incrementato in `reloadSilently` (la callback passata come `reload` a
`useRealtimeBoardSync`). I detail effect si ricaricano automaticamente.

Per effect che hanno gate interni (es.
`selectedXxxLoadAttemptsRef`/`selectedXxxFetchedTickRef`): tracciare
l'ultimo `realtimeTick` per cui è stato fatto il fetch e bypassare il
gate quando il tick cambia.

Vedi `src/modules/lavoratori/hooks/use-lavoratori-data.ts` come riferimento:
- `loadSelectedWorkerRow` con deps `[selectedWorkerId, realtimeTick]`
- `loadSelectedWorkerExtras` stesso pattern
- `loadSelectedWorkerAddress` con
  `selectedWorkerAddressFetchedTickRef` per gate per-tick

## Code review checklist

Quando una PR tocca un hook board chiediti:

- [ ] L'hook usa `useRealtimeBoardSync`?
- [ ] Esiste un detail loader (un `useEffect` con `selectedXxxId` nei
      deps, una callback `loadXxxDetail`, una `useQuery` con queryKey
      diversa dal board)?
- [ ] Il detail loader carica colonne che il board fetch non ha?
- [ ] Se sì a tutti e 3: il fix è applicato?
  - Se detail condivide cache col board → Pattern A
  - Se detail in stato separato → Pattern B
- [ ] La lint rule `no-restricted-syntax` (vedi `eslint.config.js`) non
      segnala violazioni? Se sì, dichiara `realtimeTick` nei deps
      dell'effect o sopprimi con `// eslint-disable-next-line` solo
      dopo aver verificato che l'effect non carica detail.

## Quando saltare il fix (false positive del lint)

La lint flagga `useEffect` che hanno `selectedXxxId` nei deps ma non
`realtimeTick`. Alcuni effect non hanno bisogno del refresh realtime:

- Effect che solo **resetta** stato locale al cambio di selezione (es.
  `setOpenSheet(false)`).
- Effect che **logga** o invia analytics senza fetch dati.
- Effect che **inizializza** una sola volta (early return su flag
  `hasInitialized`).

In questi casi, sopprimi con:
```ts
// eslint-disable-next-line no-restricted-syntax -- effect doesn't fetch
//   detail; refresh on realtime not needed
React.useEffect(() => { ... }, [selectedWorkerId])
```

## Vedi anche

- [`solutions/best-practices/characterization-testing-module-level-state.md`](solutions/best-practices/characterization-testing-module-level-state.md)
  — come caratterizzare con i test i primitivi di write-tracking /
  echo-suppression (`pendingWriteCount`, `lastLocalWriteAt`) su cui si appoggia
  la soppressione dell'echo realtime descritta qui.
- [`solutions/best-practices/characterization-testing-rhf-realtime-false-greens.md`](solutions/best-practices/characterization-testing-rhf-realtime-false-greens.md)
  — i tranelli "test verde ma vuoto" nel testare gli hook di autosave (RHF) e di
  sottoscrizione realtime (`useRealtimeRows`) che alimentano questi pattern.
