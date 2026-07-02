export type { ProcessoMatchingRecord } from "./types/processi-matching"
export type {
  RicercaBoardRpcProcess,
  RicercaWorkerRelatedSelectionSummary,
  RicercaWorkerSchedaResult,
} from "./types/ricerca-rpc"

export { fetchRicercaBoard } from "./queries/fetch-ricerca-board"
export { fetchRicercaWorkerRelatedSelectionSummaries } from "./queries/fetch-ricerca-worker-related-selection-summaries"
export { fetchProcessiMatching } from "./queries/fetch-processi-matching"
export { fetchProcessiMatchingByIds } from "./queries/fetch-processi-matching-by-ids"
export { fetchLavoratoriSelezioniCorrelate } from "./queries/fetch-lavoratori-selezioni-correlate"
export { fetchRicercaWorkerScheda } from "./queries/fetch-ricerca-worker-scheda"
export { fetchIndirizziInBbox } from "./queries/fetch-indirizzi-in-bbox"
export { fetchProcessiMatchingSearch } from "./queries/fetch-processi-matching-search"
export { fetchLavoratoriSearch } from "./queries/fetch-lavoratori-search"
export { fetchSelezioniLookup } from "./queries/fetch-selezioni-lookup"
export { fetchSelezioniLavoratori } from "./queries/fetch-selezioni-lavoratori"

export {
  STATI_RICERCA_CANONICI,
  type StatoRicercaDefinition,
} from "./features/ricerca/stati-ricerca"

export {
  useRicercaBoard,
  type RicercaBoardCardData,
  type RicercaBoardColumnData,
} from "./hooks/use-ricerca-board"

export {
  useRicercaWorkersPipeline,
  type RicercaWorkerSelectionCard,
  type RicercaWorkerSelectionColumn,
  type RicercaWorkersPipelineState,
} from "./hooks/use-ricerca-workers-pipeline"

export { getRicercaCenter } from "./lib/center-coords"

export { RicercaBoardView } from "./components/ricerca-board-view"
export { RicercaDetailView } from "./components/ricerca-detail-view"
export { RicercaActiveSearchCard } from "./components/ricerca-active-search-card"
