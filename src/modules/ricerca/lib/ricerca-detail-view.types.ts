import type { CrmPipelineCardData } from "@/modules/crm/types"

/**
 * Estende CrmPipelineCardData con i campi caricati via API per il detail completo.
 */
export type RicercaDetailCardData = CrmPipelineCardData &
  Partial<{
    tipoIncontroFamigliaLavoratore: string
    mansioniRichieste: string
    orarioDiLavoro: string
    richiestaPatente: boolean
    richiestaTrasferte: boolean
    richiestaFerie: boolean
    comunicaItaliano: string
    comunicaInglese: string
    famigliaMoltoEsigenteLabel: string
    nazionalitaEscluseLabel: string
    nazionalitaObbligatorieLabel: string
    richiestaAutonomiaLabel: string
    datoreSpessoPresenteLabel: string
    richiestaDiscrezioneLabel: string
    geocode: string
    descrizioneRichiestaTrasferte: string
    descrizioneRichiestaFerie: string
    indirizzoCompleto: string
    indirizzoVia: string
    indirizzoCivico: string
    indirizzoComune: string
    indirizzoCitofono: string
    indirizzoProvincia: string
    indirizzoProvaProvincia: string
    indirizzoProvaCap: string
    indirizzoProvaNote: string
    indirizzoProvaVia: string
    indirizzoProvaCivico: string
    indirizzoProvaComune: string
    indirizzoProvaCitofono: string
    indirizzoProvaLatitudine: number | null
    indirizzoProvaLongitudine: number | null
    deadlineMobile: string
    deadlineMobileRaw: string
    dataAssegnazione: string
    dataAssegnazioneRaw: string
    nucleoFamigliare: string
    descrizioneCasa: string
    metraturaCasa: string
    descrizioneAnimaliInCasa: string
    informazioniExtraRiservate: string
    etaMinima: string
    etaMassima: string
    recruiterId: string
  }>

export type RicercaDetailViewProps = {
  processId: string
  selectionId?: string | null
  onBack: () => void
  onOpenRelatedRicerca?: (processId: string, selectionId: string) => void
  onFocusSelection?: (selectionId: string | null) => void
}

export type RicercaDetailSectionEdit = {
  editing: boolean
  onToggle: () => void
  onSave?: () => void
  saving?: boolean
}

export type RicercaDetailOrariDraft = {
  orarioDiLavoro: string
  oreSettimana: string
  giorniSettimana: string
  giornatePreferite: string[]
}
