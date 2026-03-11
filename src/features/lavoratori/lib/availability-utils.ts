import type { LavoratoreRecord } from "@/types/entities/lavoratore"

export type AvailabilitySlot = {
  from: string
  to: string
}

export type AvailabilityWeekly = Record<string, AvailabilitySlot[]>

export type AvailabilitySource = {
  type?: string
  effect?: string
  id?: string
  weekly?: AvailabilityWeekly
}

export type AvailabilityPayload = {
  computed_at?: string
  weekly?: AvailabilityWeekly
  sources?: AvailabilitySource[]
}

export type AvailabilityEditDayField =
  | "lunedi"
  | "martedi"
  | "mercoledi"
  | "giovedi"
  | "venerdi"
  | "sabato"
  | "domenica"

export type AvailabilityEditBandField = "mattina" | "pomeriggio" | "sera"

export type AvailabilityMatrixDraft = Record<string, boolean>

export const AVAILABILITY_DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export const AVAILABILITY_VISIBLE_DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat"] as const
export const AVAILABILITY_HOUR_LABELS = Array.from({ length: 17 }, (_, index) =>
  `${String(index + 6).padStart(2, "0")}:00`
)
export const AVAILABILITY_EDIT_DAYS: Array<{
  day: (typeof AVAILABILITY_DAY_ORDER)[number]
  field: AvailabilityEditDayField
  label: string
}> = [
  { day: "mon", field: "lunedi", label: "Lunedi" },
  { day: "tue", field: "martedi", label: "Martedi" },
  { day: "wed", field: "mercoledi", label: "Mercoledi" },
  { day: "thu", field: "giovedi", label: "Giovedi" },
  { day: "fri", field: "venerdi", label: "Venerdi" },
  { day: "sat", field: "sabato", label: "Sabato" },
  { day: "sun", field: "domenica", label: "Domenica" },
] as const
export const AVAILABILITY_EDIT_BANDS: Array<{
  field: AvailabilityEditBandField
  label: string
  from: string
  to: string
}> = [
  { field: "mattina", label: "Mattina", from: "06:00", to: "12:00" },
  { field: "pomeriggio", label: "Pomeriggio", from: "12:00", to: "18:00" },
  { field: "sera", label: "Sera", from: "18:00", to: "22:00" },
] as const

export const AVAILABILITY_DAY_LABELS: Record<(typeof AVAILABILITY_DAY_ORDER)[number], string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Gio",
  fri: "Ven",
  sat: "Sab",
  sun: "Dom",
}

export function parseAvailabilityPayload(value: unknown): AvailabilityPayload | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = JSON.parse(value) as AvailabilityPayload
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function readAvailabilitySlots(
  weekly: AvailabilityWeekly | null | undefined,
  day: (typeof AVAILABILITY_DAY_ORDER)[number]
) {
  const slots = weekly?.[day]
  if (!Array.isArray(slots)) return []
  return slots.filter(
    (slot): slot is AvailabilitySlot =>
      Boolean(slot) &&
      typeof slot === "object" &&
      typeof slot.from === "string" &&
      typeof slot.to === "string"
  )
}

export function formatAvailabilityComputedAt(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
    .replace(",", " |")
}

export function formatDateOnly(value: string | undefined | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function timeToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":")
  const hours = Number.parseInt(hoursRaw ?? "", 10)
  const minutes = Number.parseInt(minutesRaw ?? "", 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

export function getAvailabilityMatrixKey(
  dayField: AvailabilityEditDayField,
  bandField: AvailabilityEditBandField
) {
  return `${dayField}:${bandField}`
}

function getAvailabilityBooleanField(
  dayField: AvailabilityEditDayField,
  bandField: AvailabilityEditBandField
) {
  return `disponibilita_${dayField}_${bandField}` as keyof LavoratoreRecord
}

function overlapsAvailabilityBand(
  slots: AvailabilitySlot[],
  band: (typeof AVAILABILITY_EDIT_BANDS)[number]
) {
  const bandStart = timeToMinutes(band.from)
  const bandEnd = timeToMinutes(band.to)
  if (bandStart === null || bandEnd === null) return false

  return slots.some((slot) => {
    const slotStart = timeToMinutes(slot.from)
    const slotEnd = timeToMinutes(slot.to)
    if (slotStart === null || slotEnd === null) return false
    return slotStart < bandEnd && slotEnd > bandStart
  })
}

export function buildAvailabilityMatrixDraft(
  row: LavoratoreRecord | null,
  payload: AvailabilityPayload | null
) {
  const nextDraft: AvailabilityMatrixDraft = {}

  for (const dayConfig of AVAILABILITY_EDIT_DAYS) {
    const daySlots = readAvailabilitySlots(payload?.weekly, dayConfig.day)

    for (const bandConfig of AVAILABILITY_EDIT_BANDS) {
      const key = getAvailabilityMatrixKey(dayConfig.field, bandConfig.field)
      const booleanField = getAvailabilityBooleanField(dayConfig.field, bandConfig.field)
      const fallbackValue = row?.[booleanField] === true
      nextDraft[key] = daySlots.length > 0
        ? overlapsAvailabilityBand(daySlots, bandConfig)
        : fallbackValue
    }
  }

  return nextDraft
}

export function buildAvailabilityPatchFromMatrix(
  matrix: AvailabilityMatrixDraft,
  currentPayload: AvailabilityPayload | null
) {
  const weekly: AvailabilityWeekly = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  }
  const patch: Record<string, unknown> = {}

  for (const dayConfig of AVAILABILITY_EDIT_DAYS) {
    for (const bandConfig of AVAILABILITY_EDIT_BANDS) {
      const key = getAvailabilityMatrixKey(dayConfig.field, bandConfig.field)
      const checked = matrix[key] === true
      patch[getAvailabilityBooleanField(dayConfig.field, bandConfig.field)] = checked
      if (checked) {
        weekly[dayConfig.day].push({
          from: bandConfig.from,
          to: bandConfig.to,
        })
      }
    }
  }

  patch.availability_final_json = JSON.stringify({
    computed_at: new Date().toISOString(),
    weekly,
    sources: currentPayload?.sources ?? [],
  } satisfies AvailabilityPayload)

  return patch
}

export function isAvailabilityHourActive(slots: AvailabilitySlot[], hourLabel: string) {
  const rowStart = timeToMinutes(hourLabel)
  if (rowStart === null) return false
  const rowEnd = rowStart + 60

  return slots.some((slot) => {
    const slotStart = timeToMinutes(slot.from)
    const slotEnd = timeToMinutes(slot.to)
    if (slotStart === null || slotEnd === null) return false
    return slotStart < rowEnd && slotEnd > rowStart
  })
}
