export type { ChiusuraContrattoRecord } from "./types/chiusura-contratto"
export type { VariazioneContrattualeRecord } from "./types/variazione-contrattuale"
export type {
  AssunzioniBoardRpcRow,
  AssunzioneDetailRpcResponse,
  AssunzioneNamePair,
  RapportoAssunzioneNames,
} from "./types/gestione-rpc"

export { fetchAssunzioniBoard } from "./queries/fetch-assunzioni-board"
export { fetchAssunzioneDetail } from "./queries/fetch-assunzione-detail"
export { fetchAssunzioniByIds } from "./queries/fetch-assunzioni-by-ids"
export { fetchAssunzioniByFormType } from "./queries/fetch-assunzioni-by-form-type"
export { fetchAssunzioniNamesByRapportoIds } from "./queries/fetch-assunzioni-names-by-rapporto-ids"
export { fetchVariazioniBoard } from "./queries/fetch-variazioni-board"
export { fetchVariazioniByIds } from "./queries/fetch-variazioni-by-ids"
export { fetchVariazioniByRapporto } from "./queries/fetch-variazioni-by-rapporto"
export { fetchVariazioniContrattuali } from "./queries/fetch-variazioni-contrattuali"
export { fetchChiusureBoard } from "./queries/fetch-chiusure-board"
export { fetchChiusureByIds } from "./queries/fetch-chiusure-by-ids"
export { fetchChiusureContratti } from "./queries/fetch-chiusure-contratti"

export {
  ASSUNZIONE_FIELD_BINDINGS,
  LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
  RAPPORTO_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  mapAssunzioniBoardCard,
  preserveMissingFields as preserveAssunzioniMissingFields,
  useAssunzioniBoard,
  type AssunzioneRecord,
  type AssunzioniBoardCardData,
  type AssunzioniBoardColumnData,
} from "./hooks/use-assunzioni-board"

export {
  CHIUSURA_RAPPORTO_FIELD_BINDINGS,
  CHIUSURA_RECORD_FIELD_BINDINGS,
  mapChiusuraBoardCard,
  preserveMissingFields as preserveChiusureMissingFields,
  useChiusureBoard,
  type ChiusureBoardCardData,
  type ChiusureBoardColumnData,
  type TipoLicenziamentoOption,
} from "./hooks/use-chiusure-board"

export {
  VARIAZIONE_RAPPORTO_FIELD_BINDINGS,
  VARIAZIONE_RECORD_FIELD_BINDINGS,
  mapVariazioneBoardCard,
  preserveMissingFields as preserveVariazioniMissingFields,
  useVariazioniBoard,
  type VariazioniBoardCardData,
  type VariazioniBoardColumnData,
  type VariazioniRapportoOption,
} from "./hooks/use-variazioni-board"

export { resolveDeepLinkSelection } from "./lib/assunzioni/deep-link-selection"

export { AssunzioniBoardView } from "./components/assunzioni-board-view"
export { ChiusureBoardView } from "./components/chiusure-board-view"
export { VariazioniBoardView } from "./components/variazioni-board-view"
