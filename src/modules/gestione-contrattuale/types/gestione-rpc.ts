import type { FamigliaRecord, RichiestaAttivazioneRecord } from "@/modules/crm/types"
import type { LavoratoreRecord } from "@/modules/lavoratori/types"
import type { ProcessoMatchingRecord } from "@/modules/ricerca/types"
import type { RapportoLavorativoRecord } from "@/modules/rapporti/types"

import type { ChiusuraContrattoRecord } from "./chiusura-contratto"
import type { VariazioneContrattualeRecord } from "./variazione-contrattuale"

export type AssunzioniBoardRpcRow = {
  rapporto: RapportoLavorativoRecord | null
  process: ProcessoMatchingRecord | null
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzione: Record<string, unknown> | null
  lavoratoreAssunzione: Record<string, unknown> | null
}

export type AssunzioniBoardRpcResponse = {
  rows?: AssunzioniBoardRpcRow[]
}

export type AssunzioneDetailRpcResponse = {
  rapporto: RapportoLavorativoRecord | null
  assunzione: Record<string, unknown> | null
  lavoratoreAssunzione: Record<string, unknown> | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
}

export type VariazioniBoardRpcCard = {
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
  lavoratoreAddress: Record<string, unknown> | null
}

export type VariazioniBoardRpcRapporto = {
  rapporto: RapportoLavorativoRecord
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
}

export type VariazioniBoardRpcResponse = {
  cards?: VariazioniBoardRpcCard[]
  rapporti?: VariazioniBoardRpcRapporto[]
}

export type ChiusureBoardRpcCard = {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: { id: string; nome: string | null; cognome: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null } | null
}

export type ChiusureBoardRpcRapporto = {
  rapporto: RapportoLavorativoRecord
  famiglia: { id: string; nome: string | null; cognome: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null } | null
}

export type ChiusureBoardRpcResponse = {
  cards?: ChiusureBoardRpcCard[]
  rapporti?: ChiusureBoardRpcRapporto[]
}

export type AssunzioneNamePair = {
  info_anagrafiche_cognome: string | null
  info_anagrafiche_nome: string | null
}

export type RapportoAssunzioneNames = {
  datore: AssunzioneNamePair | null
  lavoratore: AssunzioneNamePair | null
}
