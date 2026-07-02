export type { RapportoLavorativoRecord } from "./types/rapporto-lavorativo"
export type { RapportiLavorativiBoardRpcResponse } from "./types/rapporti-rpc"

export { fetchRapportiLavorativi } from "./queries/fetch-rapporti-lavorativi"
export { fetchRapportiLavorativiAll } from "./queries/fetch-rapporti-lavorativi-all"
export { fetchRapportiLavorativiBoard } from "./queries/fetch-rapporti-lavorativi-board"
export { fetchRapportiLavorativiByIds } from "./queries/fetch-rapporti-lavorativi-by-ids"

export {
  formatAssunzioneName,
  formatPersonName,
  getRapportoFamilyLabel,
  getRapportoTitle,
  getRapportoWorkerLabel,
} from "./features/rapporti/rapporti-labels"
export { getRapportoProcessIds } from "./features/rapporti/rapporti-processi"
export {
  getRapportoStatusColor,
  resolveRapportoStatus,
} from "./features/rapporti/rapporti-status"

export {
  RAPPORTO_FIELD_BINDINGS,
  mapRapportoBoardRow,
  preserveMissingFields,
  useRapportiLavorativiData,
  type RapportoStatusFilter,
} from "./hooks/use-rapporti-lavorativi-data"

export { RapportiLavorativiView } from "./components/rapporti-lavorativi-view"
export { RapportoDetailPanel } from "./components/rapporto-detail-panel"
