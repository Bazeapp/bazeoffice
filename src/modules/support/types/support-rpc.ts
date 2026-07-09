import type { ChiusuraContrattoRecord } from "@/modules/gestione-contrattuale/types"
import type { ContributoInpsRecord } from "@/types"
import type { FamigliaRecord } from "@/types"
import type { LavoratoreRecord } from "@/modules/lavoratori/types"
import type { MeseLavoratoRecord } from "@/types"
import type { PagamentoRecord } from "@/types"
import type { PresenzaMensileRecord } from "@/types"
import type { ProcessoMatchingRecord } from "@/modules/ricerca/types"
import type { RapportoLavorativoRecord } from "@/types"
import type { VariazioneContrattualeRecord } from "@/modules/gestione-contrattuale/types"

import type { TicketRecord } from "./ticket"

export type SupportTicketsBundleRpcResponse = {
  tickets?: TicketRecord[]
  rapporti?: RapportoLavorativoRecord[]
  chiusure?: ChiusuraContrattoRecord[]
  assunzioni?: Array<Record<string, unknown>>
  contributi?: ContributoInpsRecord[]
  cedolini?: MeseLavoratoRecord[]
  pagamenti?: PagamentoRecord[]
  presenze?: PresenzaMensileRecord[]
  variazioni?: VariazioneContrattualeRecord[]
  famiglie?: Array<{ id: string; nome: string | null; cognome: string | null }>
  lavoratori?: Array<{ id: string; nome: string | null; cognome: string | null }>
}

export type ProveColloquiBoardRpcRapportoEntry = {
  rapporto: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
}

export type ProveColloquiBoardRpcSelezioneEntry = {
  selezione: Record<string, unknown>
  processo: ProcessoMatchingRecord | null
  processoFamiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
}

export type ProveColloquiBoardRpcResponse = {
  rapporti?: ProveColloquiBoardRpcRapportoEntry[]
  selezioni?: ProveColloquiBoardRpcSelezioneEntry[]
}

export type RiattivazioniBoardRpcCard = {
  record: ChiusuraContrattoRecord & {
    stato_riattivazione_famiglia?: string | null
    motivazione_lost?: string | null
    data_per_riattivazione?: string | null
    sconto_proposto_riattivazione?: unknown
  }
  rapporto: RapportoLavorativoRecord | null
  famiglia: { id: string; nome: string | null; cognome: string | null; email: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null; email: string | null } | null
}

export type RiattivazioniBoardRpcResponse = {
  cards?: RiattivazioniBoardRpcCard[]
}
