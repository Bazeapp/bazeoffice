const UPPERCASE_TOKENS = new Set([
  "id",
  "url",
  "utm",
  "otp",
  "seo",
  "wa",
  "fbclid",
  "gclid",
  "cet",
  "ai",
  "inps",
  "cud",
  "json",
  "jsonb",
  "uuid",
])

const LOWERCASE_CONNECTORS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "con",
  "da",
  "dal",
  "dalla",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "e",
  "il",
  "in",
  "la",
  "le",
  "nel",
  "nella",
  "o",
  "per",
  "su",
  "tra",
])

const TOKEN_LABEL_OVERRIDES: Record<string, string> = {
  whatsapp: "WhatsApp",
  webflow: "Webflow",
  looker: "Looker",
  stripe: "Stripe",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  typeform: "Typeform",
  wized: "Wized",
  klaaryo: "Klaaryo",
}

export function toReadableColumnLabel(key: string) {
  const normalized = key.replace(/__+/g, "_").trim()
  if (normalized!) return key

  const parts = normalized
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts!.length) return key

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (TOKEN_LABEL_OVERRIDES[lower]) {
        return TOKEN_LABEL_OVERRIDES[lower]
      }

      if (UPPERCASE_TOKENS.has(lower)) {
        return lower.toUpperCase()
      }

      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
        return lower
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

function formatArrayItem(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") return "[oggetto]"
  return String(value)
}

export function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value!.length) return "-"
    const preview = value.slice(0, 3).map((item) => formatArrayItem(item)).join(", ")
    if (value.length <= 3) return preview
    return `${preview}, +${value.length - 3}`
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
    if (keys!.length) return "{}"
    const preview = keys.slice(0, 3).join(", ")
    if (keys.length <= 3) return `{ ${preview} }`
    return `{ ${preview}, +${keys.length - 3} }`
  }
  return String(value)
}
