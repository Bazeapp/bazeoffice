export type { FamigliaRecord, FamilyRow } from "./types/famiglie"
export type { RichiestaAttivazioneRecord } from "./types/richiesta-attivazione"
export type {
  CrmPipelineBoardRpcResponse,
  CrmPipelineBoardRpcRow,
} from "./types/crm-rpc"

export { fetchCrmPipelineFamigliaDetail } from "./queries/fetch-crm-pipeline-famiglia-detail"
export { fetchCrmPipelineFamiglieBoard } from "./queries/fetch-crm-pipeline-famiglie-board"
export { fetchFamiglie } from "./queries/fetch-famiglie"
export { fetchFamiglieByIds } from "./queries/fetch-famiglie-by-ids"
export { fetchFamiglieByName } from "./queries/fetch-famiglie-by-name"
export { fetchFamiglieSearch } from "./queries/fetch-famiglie-search"
export { fetchProcessiMatchingByStatoRes } from "./queries/fetch-processi-matching-by-stato-res"
export { fetchRichiesteAttivazione } from "./queries/fetch-richieste-attivazione"
export { updateProcessoMatchingStatoSales } from "./mutations/update-processo-matching-stato-sales"

export {
  fetchRichiesteAttivazioneByIds,
  fetchRichiesteAttivazioneByProcessIds,
} from "./features/richieste-attivazione/api"

export {
  ADDRESS_FIELD_BINDINGS,
  FAMILY_FIELD_BINDINGS,
  PROCESS_FIELD_BINDINGS,
  mapCardData,
  normalizeLookupPatchLabels,
  useCrmPipelinePreview,
  type CrmPipelineCardData,
  type CrmPipelineColumnData,
  type LookupOptionsByField,
} from "./hooks/use-crm-pipeline-preview"

export {
  useCrmAssegnazione,
  type AssegnazioneCardData,
} from "./hooks/use-crm-assegnazione"

export { CrmAssegnazioneView } from "./components/crm/crm-assegnazione-view"
export { CrmPipelineFamiglieView } from "./components/crm/crm-pipeline-famiglie-view"
export { FamigliaProcessoCard } from "./components/crm/famiglia-processo-card"
export { FamigliaProcessoDetailShell } from "./components/crm/famiglia-processo-detail-shell"
