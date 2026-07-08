import type { AssunzioneRecord } from "@/modules/gestione-contrattuale/types"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  RapportoLavorativoRecord,
  TicketRecord,
  VariazioneContrattualeRecord,
} from "@/types"
import type { SupportTicketType } from "../lib"

export type SupportTicketLinkedRecordType =
  | "assunzione"
  | "cedolino"
  | "chiusura"
  | "contributi"
  | "pagamento"
  | "presenze"
  | "variazione"

type SupportTicketLinkedRecordAccent =
  | "rose"
  | "amber"
  | "emerald"
  | "sky"
  | "violet"
  | "zinc"

export type SupportTicketLinkedRecord = {
  type: SupportTicketLinkedRecordType
  id: string
  label: string
  title: string
  subtitle: string | null
  status: string | null
  dateLabel: string | null
  accent: SupportTicketLinkedRecordAccent
  record:
    | AssunzioneRecord
    | ChiusuraContrattoRecord
    | ContributoInpsRecord
    | MeseLavoratoRecord
    | PagamentoRecord
    | PresenzaMensileRecord
    | VariazioneContrattualeRecord
    | null
}

export type SupportTicketBoardCardData = {
  id: string
  stage: string
  record: TicketRecord
  rapporto: RapportoLavorativoRecord | null
  linkedRecords: SupportTicketLinkedRecord[]
  tipo: SupportTicketType
  causale: string
  nomeFamiglia: string
  nomeLavoratore: string
  nomeCompleto: string
  dataAperturaLabel: string
  tag: string
  urgenza: string
  assegnatario: string
  note: string | null
  attachmentCount: number
}
