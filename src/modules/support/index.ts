export type { TicketRecord } from "./types/ticket"
export type {
  ProveColloquiBoardRpcResponse,
  ProveColloquiBoardRpcRapportoEntry,
  ProveColloquiBoardRpcSelezioneEntry,
  RiattivazioniBoardRpcCard,
  RiattivazioniBoardRpcResponse,
  SupportTicketsBundleRpcResponse,
} from "./types/support-rpc"

export { fetchProveColloquiBoard } from "./queries/fetch-prove-colloqui-board"
export { fetchRiattivazioniBoard } from "./queries/fetch-riattivazioni-board"
export { fetchSupportTicketsBundle } from "./queries/fetch-support-tickets-bundle"
export { fetchTickets } from "./queries/fetch-tickets"

export {
  getChiusuraTipoLabel,
  hasRiattivazioneStatus,
  resolveStage,
  RIATTIVAZIONI_STAGE_DEFINITIONS,
  shouldShowUnclassifiedChiusura,
  useRiattivazioniBoard,
  type RiattivazioneStageId,
  type RiattivazioniBoardCardData,
  type RiattivazioniBoardColumnData,
} from "./hooks/use-riattivazioni-board"

export {
  useProveColloquiData,
  type CalendarDateRange,
  type ColloquioCalendarEvent,
  type LookupOption,
  type ProvaCardData,
  type ProvaColumnData,
} from "./hooks/use-prove-colloqui-data"

export {
  useSupportTicketsBoard,
  type SupportTicketBoardCardData,
  type SupportTicketLinkedRecord,
  type SupportTicketLinkedRecordType,
} from "./hooks/use-support-tickets-board"

export { ProveColloquiView } from "./components/prove-colloqui/prove-colloqui-view"
export { RiattivazioniBoardView } from "./components/riattivazioni-board-view"
export { SupportTicketCreateDialog } from "./components/support/support-ticket-create-dialog"
export { SupportTicketDetailSheet } from "./components/support/support-ticket-detail-sheet"
export {
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_TAGS,
  SUPPORT_TICKET_URGENCIES,
  getSupportTicketMetadata,
  getSupportTicketTagsForType,
  inferSupportTicketTag,
  mergeSupportTicketMetadata,
  resolveSupportTicketStatus,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketMetadata,
  type SupportTicketStatus,
  type SupportTicketStatusDefinition,
  type SupportTicketTag,
  type SupportTicketTagDefinition,
  type SupportTicketType,
  type SupportTicketUrgency,
  type SupportTicketUrgencyDefinition,
} from "./components/support/support-ticket-config"
export { SupportTicketsView } from "./components/support/support-tickets-view"
