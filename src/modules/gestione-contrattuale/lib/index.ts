export {
  ASSUNZIONE_FIELD_BINDINGS,
  LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
  RAPPORTO_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  mapAssunzioniBoardCard,
  preserveMissingFields as preserveAssunzioniMissingFields,
} from "./assunzioni-board"
export {
  CHIUSURA_RAPPORTO_FIELD_BINDINGS,
  CHIUSURA_RECORD_FIELD_BINDINGS,
  mapChiusuraBoardCard,
  preserveMissingFields as preserveChiusureMissingFields,
} from "./chiusure-board"
export { resolveDeepLinkSelection } from "./deep-link-selection"
export {
  VARIAZIONE_RAPPORTO_FIELD_BINDINGS,
  VARIAZIONE_RECORD_FIELD_BINDINGS,
  mapVariazioneBoardCard,
  preserveMissingFields as preserveVariazioniMissingFields,
} from "./variazioni-board"
