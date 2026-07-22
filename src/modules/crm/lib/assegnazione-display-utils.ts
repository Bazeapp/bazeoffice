import { formatBadgeLabel } from "@/lib/format-utils"
import { hashStringDjb2 } from "@/lib/utils"

import type { AssegnazioneCardData } from "../types"

export type AssigneeValue = string | "none"

export function hasDisplayValue(value: string | null | undefined) {
  const normalized = value?.trim()
  return Boolean(normalized && normalized !== "-")
}

export function formatRoleBadgeLabel(value: string) {
  const token = value.trim().toLowerCase().replaceAll("_", " ")
  if (token.includes("badante") || token.includes("assistenza domestica"))
    return "Badante"
  if (token.includes("babysitter") || token.includes("tata")) return "Tata"
  if (token.includes("colf") || token.includes("pulizie")) return "Colf"
  return formatBadgeLabel(value)
}

export function getTipoLavoroBadges(card: AssegnazioneCardData) {
  return card.tipoLavoroBadges && card.tipoLavoroBadges.length > 0
    ? card.tipoLavoroBadges
    : card.tipoLavoroBadge
      ? [card.tipoLavoroBadge]
      : []
}

export function toDateKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short" })
    .format(date)
    .replace(".", "")
}

export function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

export function startOfDay(input: Date) {
  const date = new Date(input)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export function addDays(input: Date, days: number) {
  const date = new Date(input)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

export function buildVisibleDays(windowStart: Date) {
  return Array.from({ length: 3 }).map((_, index) => {
    const date = addDays(windowStart, index)
    return {
      key: toDateKey(date),
      date,
      label: formatDayLabel(date),
    }
  })
}

export function getAssigneeAccentClass(assigneeId: AssigneeValue) {
  if (assigneeId === "none") return "bg-zinc-400"
  const variants = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ]
  return variants[hashStringDjb2(assigneeId) % variants.length] ?? "bg-zinc-400"
}

export function getAssigneeAvatarBorderClass(assigneeId: AssigneeValue) {
  if (assigneeId === "none") return "ring-1 ring-zinc-300"
  const variants = [
    "ring-2 ring-emerald-500",
    "ring-2 ring-sky-500",
    "ring-2 ring-violet-500",
    "ring-2 ring-amber-500",
    "ring-2 ring-rose-500",
    "ring-2 ring-cyan-500",
  ]
  return (
    variants[hashStringDjb2(assigneeId) % variants.length] ?? "ring-1 ring-zinc-300"
  )
}

export function toIsoDateInput(displayDate: string) {
  const normalized = displayDate.trim()
  const parts = normalized.split("/")
  if (parts.length !== 3) return ""
  const day = parts[0]?.padStart(2, "0")
  const month = parts[1]?.padStart(2, "0")
  const year = parts[2]
  if (!day || !month || !year) return ""
  return `${year}-${month}-${day}`
}

export function getDeadlineTime(value: string | null | undefined) {
  const isoDate = value ? toIsoDateInput(value) : ""
  if (!isoDate) return Number.POSITIVE_INFINITY
  const parsed = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime()
}

export function getDeadlineAccentClass(deadline: string | null | undefined) {
  const deadlineTime = getDeadlineTime(deadline)
  if (!Number.isFinite(deadlineTime)) return "bg-zinc-300"

  const today = startOfDay(new Date()).getTime()
  const daysUntilDeadline = Math.floor(
    (deadlineTime - today) / (24 * 60 * 60 * 1000),
  )

  if (daysUntilDeadline <= 3) return "bg-red-500"
  if (daysUntilDeadline <= 7) return "bg-emerald-500"
  return "bg-zinc-300"
}

export function compareByDeadlineAsc(
  first: AssegnazioneCardData,
  second: AssegnazioneCardData,
) {
  const deadlineDelta =
    getDeadlineTime(first.deadlineMobile) - getDeadlineTime(second.deadlineMobile)
  if (deadlineDelta !== 0) return deadlineDelta
  return first.nomeFamiglia.localeCompare(second.nomeFamiglia, "it")
}

export function formatDateForView(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "-"

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed)
  }

  return raw
}

export function buildSchedulingDraft(card: AssegnazioneCardData | null) {
  return {
    statoRes: card?.statoRes ?? "da_assegnare",
    recruiterId: card?.recruiterId ?? "",
    deadlineMobile: card?.deadlineMobile
      ? toIsoDateInput(card.deadlineMobile)
      : "",
    dataAssegnazione: card?.dataAssegnazione ?? "",
  }
}

export function formatOreGiorniLabel(
  oreSettimanali: string,
  giorniSettimanali: string,
) {
  const oreToken = oreSettimanali.trim()
  const giorniToken = giorniSettimanali.trim()
  if (
    (oreToken === "" || oreToken === "-") &&
    (giorniToken === "" || giorniToken === "-")
  ) {
    return "-"
  }
  const oreLabel = oreToken && oreToken !== "-" ? `${oreToken}h` : "-"
  const giorniLabel =
    giorniToken && giorniToken !== "-" ? `${giorniToken}g` : "-"
  return `${oreLabel} | ${giorniLabel}`
}

export function getStatoResBadgeClassName(statoRes: "da_assegnare" | "fare_ricerca") {
  return statoRes === "fare_ricerca"
    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
    : "border-amber-200 bg-amber-100 text-amber-700"
}
