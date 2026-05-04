import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import { type LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import {
  attachmentPathToPublicUrl,
  normalizeAttachmentArray,
} from "@/lib/attachments"

const UPPERCASE_TOKENS = new Set(["id", "url", "utm", "seo", "wa", "inps", "uuid"])
export const DEFAULT_WORKER_AVATARS = ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png"] as const

export function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export function readAttachmentItems(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
      .map((item) => ({ ...item }))
  }

  if (value && typeof value === "object") {
    return [value as Record<string, unknown>]
  }

  return []
}

function isAllowedWorkerImageUrl(value: string) {
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith("/")) return true

  try {
    const parsed = new URL(normalized)
    const supabaseBaseUrl = asString(import.meta.env.VITE_SUPABASE_URL)

    if (supabaseBaseUrl) {
      const supabaseHost = new URL(supabaseBaseUrl).host
      if (parsed.host === supabaseHost) return true
    }

    if (typeof window !== "undefined" && parsed.host === window.location.host) {
      return true
    }
  } catch {
    return false
  }

  return false
}

export function sanitizeWorkerImageUrl(value: unknown) {
  const url = asString(value)
  if (!url) return null
  if (!isAllowedWorkerImageUrl(url)) return null
  return url
}

export function asLavoratoreRecord(value: unknown) {
  return asRecord(value) as LavoratoreRecord
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function asInputValue(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

export function asStringArrayFirst(value: unknown) {
  if (!Array.isArray(value)) return ""
  const first = value.find((item) => typeof item === "string" && item.trim())
  return typeof first === "string" ? first.trim() : ""
}

export function readArrayStrings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeDomesticRoleLabel(value: string) {
  const token = value.trim().toLowerCase().replaceAll("_", " ")
  if (!token) return ""
  if (token.includes("badante") || token.includes("assistenza domestica")) return "Badante"
  if (token.includes("babysitter") || token.includes("tata")) return "Tata"
  if (token.includes("colf") || token.includes("pulizie")) return "Colf"
  return value.trim()
}

export function normalizeDomesticRoleLabels(values: string[]) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeDomesticRoleLabel(value)
    if (!normalized) continue
    if (!result.includes(normalized)) result.push(normalized)
  }
  return result
}

export function parseNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value.trim().replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

export function toReadableColumnLabel(key: string) {
  const normalized = key.replace(/__+/g, "_").trim()
  if (!normalized) return key

  return normalized
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase()
      if (UPPERCASE_TOKENS.has(lower)) return lower.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

export function toDisplayName(row: Record<string, unknown>) {
  const nome = asString(row.nome)
  const cognome = asString(row.cognome)
  const full = `${nome} ${cognome}`.trim()
  if (full) return full
  return asString(row.nome_e_cognome) || "Lavoratore"
}

export function formatWorkerLocationLabel(
  row: Record<string, unknown>,
  address?: Record<string, unknown> | null
) {
  const city =
    asString(address?.citta) ||
    asString(address?.provincia) ||
    asString(row.citta) ||
    asString(row.provincia)
  const cap = asString(address?.cap) || asString(row.cap)
  const label = [city, cap].filter(Boolean).join(" ").trim()
  return label || null
}

export function formatWorkerAddressLine(address?: Record<string, unknown> | null) {
  if (!address) return ""
  const formatted = asString(address.indirizzo_formattato)
  if (formatted) return formatted
  return [asString(address.via), asString(address.civico)].filter(Boolean).join(" ").trim()
}

export function toAvatarUrl(row: Record<string, unknown>) {
  const permalinkPhotoUrl = sanitizeWorkerImageUrl(row.permalink_foto)
  if (permalinkPhotoUrl) return permalinkPhotoUrl

  for (const foto of normalizeAttachmentArray(row.foto)) {
    const resolved = attachmentPathToPublicUrl(foto.path)
    if (resolved) return resolved
  }

  const foto = asRecord(row.foto)
  return (
    sanitizeWorkerImageUrl(foto.url) ||
    sanitizeWorkerImageUrl(foto.public_url) ||
    sanitizeWorkerImageUrl(foto.download_url) ||
    sanitizeWorkerImageUrl(foto.src) ||
    null
  )
}

function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

export function toPublicAssetUrl(fileName: string) {
  const baseUrl = import.meta.env.BASE_URL || "/"
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return `${normalizedBaseUrl}${fileName}`
}

export function getDefaultWorkerAvatar(seed: string) {
  const normalizedSeed = seed.trim()
  if (!normalizedSeed) return null
  const index = hashString(normalizedSeed) % DEFAULT_WORKER_AVATARS.length
  const fileName = DEFAULT_WORKER_AVATARS[index]
  if (!fileName) return null
  return toPublicAssetUrl(fileName)
}

export function getAgeFromBirthDate(value: unknown) {
  const dateValue = asString(value)
  if (!dateValue) return null

  let birthDate: Date | null = null
  const slashParts = dateValue.split("/")
  if (slashParts.length === 3) {
    const day = Number.parseInt((slashParts[0] ?? "").trim(), 10)
    const month = Number.parseInt((slashParts[1] ?? "").trim(), 10)
    const year = Number.parseInt((slashParts[2] ?? "").trim(), 10)
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day > 0 &&
      month > 0 &&
      month <= 12 &&
      year > 1900
    ) {
      birthDate = new Date(year, month - 1, day)
    }
  }

  if (!birthDate) {
    const parsed = new Date(dateValue)
    if (!Number.isNaN(parsed.getTime())) {
      birthDate = parsed
    }
  }

  if (!birthDate) return null
  if (Number.isNaN(birthDate.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasNotHadBirthdayYet =
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  if (hasNotHadBirthdayYet) age -= 1
  return age >= 0 ? age : null
}

export function toListItem(
  row: Record<string, unknown>,
  options: {
    isBlacklisted: boolean
    statusFlags: Pick<LavoratoreListItem, "isQualified" | "isIdoneo" | "isCertificato">
  }
): LavoratoreListItem {
  const workerId = asString(row.id)
  const imageUrl = toAvatarUrl(row)
  const normalizedDomesticRoles = normalizeDomesticRoleLabels(readArrayStrings(row.tipo_lavoro_domestico))
  const firstDomesticRole = normalizedDomesticRoles[0] ?? null

  return {
    id: workerId,
    nomeCompleto: toDisplayName(row),
    immagineUrl: imageUrl ?? getDefaultWorkerAvatar(workerId),
    locationLabel: formatWorkerLocationLabel(row),
    telefono: asString(row.telefono) || null,
    isBlacklisted: options.isBlacklisted,
    tipoRuolo: firstDomesticRole,
    tipoRuoloColor: null,
    tipoLavoro: asStringArrayFirst(row.tipo_rapporto_lavorativo) || null,
    tipoLavoroColor: null,
    ruoliDomestici: normalizedDomesticRoles,
    statoLavoratore: asString(row.stato_lavoratore) || null,
    statoLavoratoreColor: null,
    disponibilita: asString(row.disponibilita) || null,
    disponibilitaColor: null,
    isDisponibile: null,
    isQualified: options.statusFlags.isQualified,
    isIdoneo: options.statusFlags.isIdoneo,
    isCertificato: options.statusFlags.isCertificato,
  }
}
