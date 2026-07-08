import type { FamigliaRecord } from "@/types"
import type { LavoratoreRecord } from "@/types"
import type { RapportoLavorativoRecord } from "@/types"

import type { MeseCalendarioRecord } from "./mese-calendario"
import type { MeseLavoratoRecord } from "./mese-lavorato"
import type { PagamentoRecord } from "./pagamento"
import type { PresenzaMensileRecord } from "./presenza-mensile"
import type { TransazioneFinanziariaRecord } from "./transazione-finanziaria"

export type CedoliniRichiestaAttivazioneSlim = {
  id: string
  fee_concordata: number | null
}

export type CedoliniBoardRpcRow = {
  record: MeseLavoratoRecord
  mese: MeseCalendarioRecord | null
  rapporto: RapportoLavorativoRecord | null
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  transazione: TransazioneFinanziariaRecord | null
  pagamento: PagamentoRecord | null
  richiestaAttivazione: CedoliniRichiestaAttivazioneSlim | null
  presenzeIrregolari: boolean | null
}

export type CedoliniBoardRpcResponse = {
  rows?: CedoliniBoardRpcRow[]
  total?: number
}

export type CedolinoDetailRpcResponse = {
  record: MeseLavoratoRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: FamigliaRecord | null
  mese: MeseCalendarioRecord | null
  presenze: PresenzaMensileRecord | null
  presenzeRegolari: PresenzaMensileRecord | null
  richiestaAttivazione: CedoliniRichiestaAttivazioneSlim | null
}
