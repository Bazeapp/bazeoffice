import type { DragEvent } from "react"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
} from "@/types"

export type AssunzioneRecord = {
  id: string
  creato_il?: string | null
  delega_inps_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  civico_se_diverso_residenza: string | null
  codice_fiscale_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  comune_se_diverso_residenza: string | null
  dati_bancari_lavoratore: string | null
  documento_identita_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  documento_identita_numero: string | null
  documento_identita_scadenza: string | null
  documento_identita_tipo: string | null
  famiglia_id: string | null
  cittadino_extracomunitario: string | null
  info_anagrafiche_cap: string | null
  info_anagrafiche_cittadidanza: string | null
  info_anagrafiche_civico: string | null
  info_anagrafiche_codice_fiscale: string | null
  info_anagrafiche_cognome: string | null
  info_anagrafiche_data_di_nascita: string | null
  info_anagrafiche_email: string | null
  info_anagrafiche_indirizzo: string | null
  info_anagrafiche_localita: string | null
  info_anagrafiche_luogo_di_nascita: string | null
  info_anagrafiche_nome: string | null
  info_anagrafiche_numero_fisso: string | null
  info_anagrafiche_numero_mobile: string | null
  luogo_lavoro_se_diverso_da_residenza: string | null
  mansione_lavoratore: string | null
  mezza_giornata_di_riposo: string | null
  ore_di_lavoro: number | string | null
  ore_giovedi: number | string | null
  ore_lunedi: number | string | null
  ore_martedi: number | string | null
  ore_mercoledi: number | string | null
  ore_sabato: number | string | null
  ore_venerdi: number | string | null
  provincia: string | null
  permesso_di_soggiorno_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  rapporto_di_lavoro_residenza: boolean | null
  lavoratore_id: string | null
  regime_convivenza: string | null
  ricevuta_rinnovo_permesso_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  telecamere_posto_lavoro: string | null
  tredicesima_rateizzata_mensile: string | null
  note_aggiuntive: string | null
  data_assunzione: string | null
  type_of_compilazione_form: string | null
}

export type AssunzioniBoardCardData = {
  id: string
  processId: string | null
  stage: string
  process: ProcessoMatchingRecord | null
  assunzione: AssunzioneRecord | null
  lavoratoreAssunzione: AssunzioneRecord | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
  rapporto: RapportoLavorativoRecord | null
  lavoratore: LavoratoreRecord | null
  famiglia: FamigliaRecord | null
  famigliaId: string | null
  nomeFamiglia: string
  nomeLavoratore: string
  email: string
  telefono: string
  titoloAnnuncio: string | null
  tipoRapporto: string | null
  deadline: string
}

export type AssunzioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: AssunzioniBoardCardData[]
  deferred: boolean
  loadError: string | null
  loaded: boolean
  loading: boolean
}

export type AssunzioniBoardDragHandlers = {
  draggingProcessId: string | null
  dropTargetColumnId: string | null
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (columnId: string, event: DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
}
