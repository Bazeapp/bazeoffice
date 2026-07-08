import type {
  FamigliaRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  RapportoLavorativoRecord,
  TransazioneFinanziariaRecord,
} from "@/types"

export type PayrollBoardCardData = {
  id: string
  stage: string
  record: MeseLavoratoRecord
  famiglia: FamigliaRecord | null
  pagamento: PagamentoRecord | null
  transazione: TransazioneFinanziariaRecord | null
  presenze: PresenzaMensileRecord | null
  presenzeRegolari: PresenzaMensileRecord | null
  rapporto: RapportoLavorativoRecord | null
  mese: MeseCalendarioRecord | null
  richiestaAttivazione: { id: string; fee_concordata: number | null } | null
  presenzeIrregolari: boolean
  nomeCompleto: string
  importoLabel: string | null
  dataInvioLabel: string | null
}

export type PayrollBoardColumnData = {
  id: string
  label: string
  color: string
  cards: PayrollBoardCardData[]
}
