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
} from "./use-assunzioni-board"

export {
  CHIUSURA_RAPPORTO_FIELD_BINDINGS,
  CHIUSURA_RECORD_FIELD_BINDINGS,
  mapChiusuraBoardCard,
  preserveMissingFields as preserveChiusureMissingFields,
  useChiusureBoard,
  type ChiusureBoardCardData,
  type ChiusureBoardColumnData,
  type TipoLicenziamentoOption,
} from "./use-chiusure-board"

export {
  VARIAZIONE_RAPPORTO_FIELD_BINDINGS,
  VARIAZIONE_RECORD_FIELD_BINDINGS,
  mapVariazioneBoardCard,
  preserveMissingFields as preserveVariazioniMissingFields,
  useVariazioniBoard,
  type VariazioniBoardCardData,
  type VariazioniBoardColumnData,
  type VariazioniRapportoOption,
} from "./use-variazioni-board"
