export function isValidFamilyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function normalizeFamilyPhoneValue(value: string) {
  const compact = value.replace(/[\s().-]/g, "")
  if (!compact) return ""
  if (compact.startsWith("00")) return `+${compact.slice(2)}`
  if (compact.startsWith("+")) return compact
  return `+39${compact}`
}

export function isValidFamilyPhoneValue(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

export function splitReferenteName(value: string) {
  const parts = value.split(/\s+/).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return { nome: null, cognome: null }
  if (parts.length === 1) return { nome: parts[0], cognome: null }
  return {
    nome: parts[0],
    cognome: parts.slice(1).join(" "),
  }
}
