export type VariazioneAnagraficaField = {
  key: string
  label: string
  placeholder?: string
  readOnly?: boolean
}

export type VariazioneAttachmentSlot =
  | "accordo_variazione_contrattuale"
  | "ricevuta_inps_variazione_rapporto"

export const VARIAZIONE_WORKER_FIELDS: VariazioneAnagraficaField[] = [
  { key: "email", label: "Email", placeholder: "email@dominio.it" },
  { key: "telefono", label: "Telefono", placeholder: "+39..." },
  { key: "iban", label: "IBAN" },
  { key: "indirizzo_residenza_completo", label: "Indirizzo residenza", readOnly: true },
  { key: "cap", label: "CAP", readOnly: true },
  { key: "provincia", label: "Provincia" },
  { key: "documenti_in_regola", label: "Documenti in regola" },
  { key: "docs_scadenza_permesso_di_soggiorno", label: "Scadenza permesso" },
]

export const VARIAZIONE_FAMILY_FIELDS: VariazioneAnagraficaField[] = [
  { key: "email", label: "Email", placeholder: "email@dominio.it" },
  { key: "customer_email", label: "Email cliente" },
  { key: "secondary_email", label: "Email secondaria" },
  { key: "telefono", label: "Telefono" },
  { key: "whatsapp", label: "WhatsApp" },
]

export const VARIAZIONE_DETAILS_KEYS = new Set(["data_variazione", "variazione_da_applicare"])

export const VARIAZIONE_NUMERIC_RAPPORTO_KEYS = new Set(["paga_oraria_lorda", "ore_a_settimana"])

export function toVariazioneDisplayValue(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}
