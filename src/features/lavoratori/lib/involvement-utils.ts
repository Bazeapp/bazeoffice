type RowLike = Record<string, unknown>

const DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "inviato al cliente in attesa di feedback",
  "colloquio schedulato",
  "colloquio fatto",
  "colloquio rimandato",
  "prova schedulata",
  "prova in corso",
  "prova rimandata",
  "match",
])

const NON_ACTIVE_WORK_STATUS_TOKEN = "non attivo"

export function normalizeInvolvementToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll(",", " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function hasActiveWorkSituation(selection: RowLike) {
  return (
    normalizeInvolvementToken(selection.stato_situazione_lavorativa) !==
    NON_ACTIVE_WORK_STATUS_TOKEN
  )
}

export function isDirectInvolvementSelection(selection: RowLike) {
  return (
    hasActiveWorkSituation(selection) &&
    DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS.has(
      normalizeInvolvementToken(selection.stato_selezione)
    )
  )
}
