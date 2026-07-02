export type { ContributoInpsRecord } from "./types/contributo-inps"
export type { MeseCalendarioRecord } from "./types/mese-calendario"
export type { MeseLavoratoRecord } from "./types/mese-lavorato"
export type { PagamentoRecord } from "./types/pagamento"
export type { PresenzaMensileRecord } from "./types/presenza-mensile"
export type { TransazioneFinanziariaRecord } from "./types/transazione-finanziaria"
export type {
  CedoliniBoardRpcResponse,
  CedoliniBoardRpcRow,
  CedoliniRichiestaAttivazioneSlim,
  CedolinoDetailRpcResponse,
} from "./types/payroll-rpc"

export { fetchCedoliniBoard } from "./queries/fetch-cedolini-board"
export { fetchCedolinoDetail } from "./queries/fetch-cedolino-detail"
export { fetchContributiInps } from "./queries/fetch-contributi-inps"
export { fetchContributiInpsByIds } from "./queries/fetch-contributi-inps-by-ids"
export { fetchContributiInpsByPeriod } from "./queries/fetch-contributi-inps-by-period"
export { fetchContributiInpsByRapporto } from "./queries/fetch-contributi-inps-by-rapporto"
export { fetchMesiCalendario } from "./queries/fetch-mesi-calendario"
export { fetchMesiCalendarioAll } from "./queries/fetch-mesi-calendario-all"
export { fetchMesiCalendarioByIds } from "./queries/fetch-mesi-calendario-by-ids"
export { fetchMesiLavorati } from "./queries/fetch-mesi-lavorati"
export { fetchMesiLavoratiByRapporto } from "./queries/fetch-mesi-lavorati-by-rapporto"
export { fetchPagamenti } from "./queries/fetch-pagamenti"
export { fetchPagamentiByTicketIds } from "./queries/fetch-pagamenti-by-ticket-ids"
export { fetchPagamentiByTransazioneIds } from "./queries/fetch-pagamenti-by-transazione-ids"
export { fetchPresenzeByIds } from "./queries/fetch-presenze-by-ids"
export { fetchPresenzeMensili } from "./queries/fetch-presenze-mensili"
export { fetchTransazioniByMeseLavoratoIds } from "./queries/fetch-transazioni-by-mese-lavorato-ids"
export { fetchTransazioniFinanziarie } from "./queries/fetch-transazioni-finanziarie"

export {
  PRESERVED_DETAIL_FIELDS,
  TERMINAL_STAGE_IDS,
  preserveDetailFields,
  usePayrollBoard,
  type PayrollBoardCardData,
  type PayrollBoardColumnData,
} from "./hooks/use-payroll-board"

export {
  getQuarterDateRange,
  useContributiInpsBoard,
  type ContributoInpsBoardCardData,
  type ContributoQuarterValue,
} from "./hooks/use-contributi-inps-board"

export {
  CEDOLINI_FILTER_GROUPS,
  CASO_PARTICOLARE_FILTER_OPTIONS,
  PRESENZE_FILTER_OPTIONS,
  STATO_PAGAMENTO_FILTER_OPTIONS,
  TIPO_UTENTE_FILTER_OPTIONS,
  cardMatchesCedoliniFilters,
  createDefaultCedoliniFilters,
  getCasoParticolareFilterValue,
  getPresenzeFilterValue,
  getStatoPagamentoFilterValue,
  getTipoUtenteFilterValue,
  isAbbonamentoCard,
  isCardPaid,
  normalizeCaseFlag,
  toggleCedoliniFilter,
  type CedoliniFilterGroupKey,
  type CedoliniFilterableCard,
  type CedoliniFilterOption,
  type CedoliniFilters,
} from "./components/payroll/cedolini-filters"

export {
  ContributiInpsView,
  ContributoInpsDetailSheet,
  type ContributiColumnData,
} from "./components/payroll/contributi-inps-view"
export {
  CedolinoDetailSheet,
  PayrollOverviewView,
} from "./components/payroll/payroll-overview-view"
