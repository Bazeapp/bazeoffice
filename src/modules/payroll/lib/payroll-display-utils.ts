import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import { normalizeCaseFlag } from "./cedolini-filters"

export type PayrollMetric = {
  title: string
  value: string
  className?: string
}

export type PresenceDayRow = {
  day: number
  type: string
  hours: string
  event: string
  sicknessCode: string
  note: string
}

export type PresenceSelectOption = {
  value: string
  label: string
}

export const EMPTY_PRESENCE_SELECT_VALUE = "__empty__"
export const PRESENCE_SELECT_TRIGGER_CLASS =
  "h-8 justify-between text-left [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left"

export const PRESENCE_DAY_FIELD_REGEX =
  /^(ore_day_|evento_day_|codice_malattia_day_|note_day_)\d+$/

export const CASO_PARTICOLARE_OPTIONS: PresenceSelectOption[] = [
  { value: "no", label: "Regolare" },
  { value: "si", label: "Caso particolare" },
  { value: "chiusura", label: "Chiusura rapporto" },
]

export const PRESENCE_DAY_TYPE_OPTIONS: PresenceSelectOption[] = [
  { value: "festivo", label: "Festivo" },
  { value: "lavorativo", label: "Lavorativo" },
  { value: "non-lavorativo", label: "Non lavorativo" },
]

export const PRESENCE_EVENT_OPTIONS: PresenceSelectOption[] = [
  { value: "unpaidLeave", label: "Permesso non retribuito" },
  { value: "paidLeave", label: "Permesso retribuito" },
  { value: "medicalVisit", label: "Visita medica" },
  { value: "training", label: "Formazione" },
  { value: "bereavement", label: "Lutto" },
  { value: "marriage", label: "Matrimonio" },
  { value: "maternityPaternity", label: "Maternita/Paternita" },
  { value: "overtime", label: "Straordinario" },
  { value: "vacation", label: "Ferie" },
  { value: "sickness", label: "Malattia" },
]

const WEEKDAY_LETTERS_IT = ["D", "L", "M", "M", "G", "V", "S"] as const

export function getGoogleDriveFileId(url: string) {
  const filePathMatch = url.match(/\/file\/d\/([^/?#]+)/)
  if (filePathMatch?.[1]) return filePathMatch[1]

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.searchParams.get("id")
  } catch {
    return null
  }
}

export function toInlineDocumentUrl(url: string) {
  const driveFileId = getGoogleDriveFileId(url)
  if (driveFileId && url.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`
  }

  return url
}

export function buildPayrollMetrics(columns: PayrollBoardColumnData[]): PayrollMetric[] {
  const cards = columns.flatMap((column) => column.cards)
  const rapportiAttivi = new Set(
    cards
      .map((card) => card.rapporto?.id)
      .filter((value): value is string => Boolean(value)),
  ).size
  const cedoliniTotali = cards.length
  const presenzeDaRaccogliere = cards.filter((card) => !card.record.presenze_id).length
  const presenzeRicevute = cards.filter((card) => Boolean(card.record.presenze_id)).length
  const inviati = cards.filter((card) => card.stage === "Inviato cedolino").length
  const pagati = cards.filter((card) => card.stage === "Pagato").length
  const daPagare = cards.filter((card) =>
    ["Cedolino da controllare", "Cedolino Pronto", "Inviato cedolino", "Richiesta chiarimenti"].includes(
      card.stage,
    ),
  ).length

  return [
    { title: "Rapporti attivi", value: String(rapportiAttivi) },
    { title: "Cedolini totali", value: String(cedoliniTotali) },
    { title: "Presenze da raccogliere", value: String(presenzeDaRaccogliere) },
    { title: "Presenze ricevute", value: String(presenzeRicevute) },
    { title: "Inviati", value: String(inviati) },
    { title: "Pagati", value: String(pagati) },
    { title: "Da pagare", value: String(daPagare) },
  ]
}

export function getCurrentMonthValue() {
  const now = new Date()
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0")
  return `${now.getUTCFullYear()}-${month}`
}

export function shiftMonth(value: string, delta: number) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getCurrentMonthValue()
  }

  const nextDate = new Date(Date.UTC(year, month - 1 + delta, 1))
  const nextMonth = `${nextDate.getUTCMonth() + 1}`.padStart(2, "0")
  return `${nextDate.getUTCFullYear()}-${nextMonth}`
}

export function formatMonthLabel(value: string) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return value
  }

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

export function getCedolinoTypeLabel(value: string | null | undefined) {
  const normalized = normalizeCaseFlag(value)
  if (normalized === "chiusura") return "Chiusura rapporto"
  if (normalized === "si") return "Caso particolare"
  return "Regolare"
}

export function getCedolinoTypeClassName(value: string | null | undefined) {
  const normalized = normalizeCaseFlag(value)
  if (normalized === "chiusura") return "bg-rose-100 text-rose-700 hover:bg-rose-100"
  if (normalized === "si") return "bg-amber-100 text-amber-700 hover:bg-amber-100"
  return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
}

export function withCurrentPresenceOption(options: PresenceSelectOption[], currentValue: string) {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options
  }

  return [
    ...options,
    {
      value: currentValue,
      label: currentValue,
    },
  ]
}

export function getWeekdayLetter(yearMonth: string | null | undefined, day: number): string {
  if (!yearMonth) return ""
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ""
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return ""
  return WEEKDAY_LETTERS_IT[date.getUTCDay()]
}

export function getPresenceRegolariHours(
  record: PayrollBoardCardData["presenzeRegolari"],
  day: number,
): string {
  if (!record) return ""
  const raw = record[`ore_day_${day}`]
  if (raw === null || raw === undefined) return ""
  return String(raw).trim()
}

export function getDayTypeLabel(type: string): string {
  if (!type) return ""
  return PRESENCE_DAY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function getDaysInMonth(meseDataFine: string | null | undefined): number {
  if (!meseDataFine) return 31
  const parsed = new Date(meseDataFine)
  if (Number.isNaN(parsed.getTime())) return 31
  return parsed.getUTCDate()
}

export function buildPresenceDayRows(
  record: PayrollBoardCardData["presenze"],
  daysInMonth: number = 31,
): PresenceDayRow[] {
  if (!record) return []

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const type = String(record[`tipo_day_${day}`] ?? "").trim()
    const hours = String(record[`ore_day_${day}`] ?? "").trim()
    const event = String(record[`evento_day_${day}`] ?? "").trim()
    const sicknessCode = String(record[`codice_malattia_day_${day}`] ?? "").trim()
    const note = String(record[`note_day_${day}`] ?? "").trim()

    return {
      day,
      type,
      hours,
      event,
      sicknessCode,
      note,
    }
  })
}

export function sumPresenceHours(
  record: PayrollBoardCardData["presenzeRegolari"],
  range?: { startDay: number; endDay: number } | null,
): number | null {
  if (!record) return null

  const startDay = range?.startDay ?? 1
  const endDay = range?.endDay ?? 31
  if (endDay < startDay) return 0

  let total = 0
  for (let day = startDay; day <= endDay; day += 1) {
    const value = Number(record[`ore_day_${day}`])
    if (Number.isFinite(value)) total += value
  }
  return total
}

export function getPayrollDayRange(
  mese: { data_inizio: string | null; data_fine: string | null } | null | undefined,
  rapporto: { data_inizio_rapporto?: string | null; data_fine_rapporto?: string | null } | null | undefined,
): { startDay: number; endDay: number } | null {
  const meseInizio = mese?.data_inizio
  const meseFine = mese?.data_fine
  if (!meseInizio || !meseFine) return null

  const monthKey = meseInizio.slice(0, 7)
  let startDay = Number(meseInizio.slice(8, 10))
  let endDay = Number(meseFine.slice(8, 10))
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) return null

  const dataInizioRapporto = rapporto?.data_inizio_rapporto
  if (dataInizioRapporto && dataInizioRapporto.slice(0, 7) === monthKey) {
    const day = Number(dataInizioRapporto.slice(8, 10))
    if (Number.isFinite(day) && day > startDay) startDay = day
  }

  const dataFineRapporto = rapporto?.data_fine_rapporto
  if (dataFineRapporto && dataFineRapporto.slice(0, 7) === monthKey) {
    const day = Number(dataFineRapporto.slice(8, 10))
    if (Number.isFinite(day) && day < endDay) endDay = day
  }

  return { startDay, endDay }
}

export function formatHoursValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Non disponibile"
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}
