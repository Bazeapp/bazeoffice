import {
  isValidFamilyEmail,
  isValidFamilyPhoneValue,
  normalizeFamilyPhoneValue,
} from "@/lib/family-contact-validation"

export type FamilyContactFieldKey = "telefono" | "email"

/**
 * BAZ-192 — validazione client-side dei campi contatto famiglia (telefono/email)
 * autosalvati nella sidebar del dettaglio ricerca.
 *
 * È un **mirror esatto** del gate backend `update-record` per la table
 * `famiglie` (`validateAndNormalizeFamilyContactPatch`): stessa normalizzazione
 * PRIMA della regex (telefono) e stesso trim+lowercase (email). Serve a NON
 * inviare un intermedio non valido (che il backend rifiuterebbe con 400) e a
 * mostrarlo inline senza rollback distruttivo. Il vuoto è invalido come lato
 * backend (`"telefono" in patch` con valore vuoto → 400).
 *
 * Ritorna un messaggio d'errore italiano se il valore non è inviabile, `null`
 * se è valido.
 */
export function resolveFamilyContactFieldError(
  key: FamilyContactFieldKey,
  rawValue: string,
): string | null {
  if (key === "telefono") {
    const normalized = normalizeFamilyPhoneValue(rawValue.trim())
    if (!normalized) return "Il telefono è obbligatorio"
    if (!isValidFamilyPhoneValue(normalized)) {
      return "Telefono non valido: usa il formato internazionale, es. +393331234567"
    }
    return null
  }

  const normalized = rawValue.trim().toLowerCase()
  if (!normalized) return "L'email è obbligatoria"
  if (!isValidFamilyEmail(normalized)) return "Email non valida"
  return null
}
