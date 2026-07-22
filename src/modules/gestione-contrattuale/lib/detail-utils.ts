import type { AssunzioneRecord, AssunzioniBoardCardData } from "../types"
import type { DocumentoLavoratoreRecord } from "@/modules/lavoratori/types"
import {
  findLookupOption,
  getLookupSelectValue,
} from "@/modules/lavoratori/lib"

export function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export type DetailTarget = "datore" | "lavoratore"
export type LookupOption = { value: string; label: string }

export const TIPO_CONTRATTO_OPTIONS = ["A", "B", "BS", "C", "CS", "D", "DS"] as const

// Il campo "Tipologia contratto" accetta solo i livelli CCNL qui sopra. Valori
// che arrivano da altre fonti (es. "Indeterminato" dal sync esterno) non sono
// validi: li trattiamo come vuoto così il campo mostra il placeholder invece di
// un'opzione inesistente.
export function isValidTipoContratto(value: string | null | undefined) {
  return Boolean(value) && (TIPO_CONTRATTO_OPTIONS as readonly string[]).includes(value as string)
}
export const REGIME_NON_CONVIVENTE = "Il lavoratore NON è convivente"
export const REGIME_CONVIVENTE = "Il lavoratore è convivente"
export const TIPO_UTENTE_OPTIONS = ["DATORE LAVORO", "LAVORATORE"] as const
export const ASSUNZIONE_DATORE_FORM_TYPE = "DATORE LAVORO"
export const ASSUNZIONE_LAVORATORE_FORM_TYPE = "LAVORATORE"
export const SCONTO_APPLICATO_OPTIONS: LookupOption[] = [
  { value: "50%", label: "50%" },
  { value: "prova_gratuita", label: "prova_gratuita" },
  { value: "100€", label: "100€" },
]

export const ASSUNZIONE_DETAIL_SELECT = [
  "id",
  "creato_il",
  "delega_inps_allegati",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
  "famiglia_id",
  "cittadino_extracomunitario",
  "info_anagrafiche_cap",
  "info_anagrafiche_cittadidanza",
  "info_anagrafiche_civico",
  "info_anagrafiche_codice_fiscale",
  "info_anagrafiche_cognome",
  "info_anagrafiche_data_di_nascita",
  "info_anagrafiche_email",
  "info_anagrafiche_indirizzo",
  "info_anagrafiche_localita",
  "info_anagrafiche_luogo_di_nascita",
  "info_anagrafiche_nome",
  "info_anagrafiche_numero_fisso",
  "info_anagrafiche_numero_mobile",
  "luogo_lavoro_se_diverso_da_residenza",
  "mansione_lavoratore",
  "mezza_giornata_di_riposo",
  "ore_di_lavoro",
  "ore_giovedi",
  "ore_lunedi",
  "ore_martedi",
  "ore_mercoledi",
  "ore_sabato",
  "ore_venerdi",
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "lavoratore_id",
  "regime_convivenza",
  "ricevuta_rinnovo_permesso_allegati",
  "telecamere_posto_lavoro",
  "tredicesima_rateizzata_mensile",
  "note_aggiuntive",
  "data_assunzione",
  "type_of_compilazione_form",
] satisfies string[]

export function toNullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toInputValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ""
  return String(value)
}

export function normalizeRegimeConvivenza(value: string | null | undefined) {
  if (!value) return REGIME_NON_CONVIVENTE
  if (value === "Il lavoratore NON e convivente") return REGIME_NON_CONVIVENTE
  if (value === "Il lavoratore e convivente") return REGIME_CONVIVENTE
  return value
}

export type AssunzioneAttachmentSlot =
  | "documento_identita_allegati"
  | "codice_fiscale_allegati"
  | "delega_inps_allegati"
  | "permesso_di_soggiorno_allegati"
  | "ricevuta_rinnovo_permesso_allegati"

export type AssunzioneAttachmentTarget = "datore" | "lavoratore"

export type AssunzioneCandidatesByTarget = Record<DetailTarget, AssunzioneRecord[]>

export function compactText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

export function resolveAssunzioneDisplayName(record: AssunzioneRecord) {
  return (
    [compactText(record.info_anagrafiche_nome), compactText(record.info_anagrafiche_cognome)]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  )
}

export function resolveAssunzioneFormLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return (
    resolveAssunzioneDisplayName(record) ??
    (target === "datore" ? card?.nomeFamiglia : card?.nomeLavoratore) ??
    "Senza nome"
  )
}

export function resolveAssunzioneFormSubLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return (
    compactText(record.info_anagrafiche_email) ??
    (target === "datore" ? compactText(card?.email) : compactText(card?.lavoratore?.email)) ??
    (target === "datore" ? compactText(card?.telefono) : compactText(card?.lavoratore?.telefono)) ??
    "-"
  )
}

export function formatSelectedAssunzioneLabel(
  record: AssunzioneRecord,
  target: DetailTarget,
  card: AssunzioniBoardCardData | null
) {
  return `${resolveAssunzioneFormLabel(record, target, card)} • ${resolveAssunzioneFormSubLabel(
    record,
    target,
    card
  )}`
}

export function matchesAssunzioneSearch(record: AssunzioneRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const values = [
    record.id,
    record.info_anagrafiche_nome,
    record.info_anagrafiche_cognome,
    [record.info_anagrafiche_nome, record.info_anagrafiche_cognome].filter(Boolean).join(" "),
    [record.info_anagrafiche_cognome, record.info_anagrafiche_nome].filter(Boolean).join(" "),
    record.info_anagrafiche_email,
    record.info_anagrafiche_numero_mobile,
    record.info_anagrafiche_codice_fiscale,
  ]
    .map((value) => compactText(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value))

  const haystack = values.join(" ")
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  return tokens.every((token) => haystack.includes(token))
}

export function mergeAssunzioneOptions(
  currentRecord: AssunzioneRecord | null | undefined,
  records: AssunzioneRecord[]
) {
  const merged = new Map<string, AssunzioneRecord>()
  for (const record of records) {
    if (record.id) merged.set(record.id, record)
  }
  if (currentRecord?.id && !merged.has(currentRecord.id)) {
    merged.set(currentRecord.id, currentRecord)
  }
  return Array.from(merged.values())
}

export function buildLookupOptions(
  rows: Array<{
    entity_table: string | null
    entity_field: string | null
    value_key: string | null
    value_label: string | null
    is_active: boolean | null
  }>,
  entityTable: string,
  entityField: string,
  fallbackValue?: string | null
) {
  const options = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === entityTable &&
        row.entity_field === entityField &&
        row.value_key &&
        row.value_label
    )
    .map((row) => ({
      value: row.value_key as string,
      label: row.value_label as string,
    }))

  const fallback = fallbackValue?.trim()
  if (fallback && !findLookupOption(options, fallback)) {
    return [{ value: fallback, label: fallback }, ...options]
  }
  return options
}

export function getLookupSelectDisplayValue(
  value: string | null | undefined,
  options: LookupOption[]
) {
  return getLookupSelectValue(value, options, "") || undefined
}

export function getLookupLabelForSave(value: string, options: LookupOption[]) {
  return findLookupOption(options, value)?.label ?? value
}

export function hasAssunzioneCoreDetails(assunzione: AssunzioneRecord | null | undefined) {
  return Boolean(
    assunzione?.info_anagrafiche_codice_fiscale ||
      assunzione?.info_anagrafiche_data_di_nascita ||
      assunzione?.info_anagrafiche_luogo_di_nascita ||
      assunzione?.info_anagrafiche_indirizzo ||
      assunzione?.info_anagrafiche_cap ||
      assunzione?.documento_identita_numero ||
      assunzione?.dati_bancari_lavoratore
  )
}

export function collectAttachmentValues(...values: unknown[]) {
  const attachments = values.flatMap((value) => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  })

  return attachments.length > 0 ? attachments : null
}

export function collectDocumentAttachments(
  documents: DocumentoLavoratoreRecord[],
  fields: Array<keyof DocumentoLavoratoreRecord>
) {
  const attachments: unknown[] = []

  for (const document of documents) {
    for (const field of fields) {
      const value = document[field]
      if (!value) continue
      if (Array.isArray(value)) {
        attachments.push(...value)
      } else {
        attachments.push(value)
      }
    }
  }

  return attachments.length > 0 ? attachments : null
}
