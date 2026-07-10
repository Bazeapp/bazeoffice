import type { CalendarDateRange, ColloquioCalendarEvent } from "../types"

export type CalendarStatusKey = "match" | "no-match" | "prova" | "colloquio" | "standby"

function normalizeToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

export function getTrialElapsedDays(startValue: string | null | undefined) {
  if (!startValue) return null
  const start = new Date(startValue)
  if (Number.isNaN(start.getTime())) return null
  const startDay = startOfLocalDay(start)
  const today = startOfLocalDay(new Date())
  return Math.floor((today.getTime() - startDay.getTime()) / 86_400_000) + 1
}

export function getTrialDayLabel(days: number | null) {
  if (days === null) return "Giorno prova non disponibile"
  if (days < 0) return `Inizia tra ${Math.abs(days)} ${Math.abs(days) === 1 ? "giorno" : "giorni"}`
  return `D${days}`
}

export function toDateRangeValue(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function hasDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function getCalendarDateKey(value: string | null | undefined) {
  if (!value) return null
  const directDate = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  if (directDate) return directDate[1]
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : toDateRangeValue(date)
}

export function isPastDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

export function isNegativeCalendarStatus(value: string | null | undefined) {
  const token = normalizeToken(value)
  return (
    token.includes("no match") ||
    token.includes("negativ") ||
    token.includes("critic") ||
    token.includes("chius") ||
    token.includes("concluso") ||
    token.includes("annull") ||
    token.includes("non interessato") ||
    token.includes("out of target")
  )
}

export function isOpenCalendarStatus(value: string | null | undefined) {
  const token = normalizeToken(value)
  return Boolean(token) && !isNegativeCalendarStatus(token)
}

export function getCalendarEventTone(
  status: string | null | undefined,
  start: string,
): "ok" | "warning" {
  return isNegativeCalendarStatus(status) || (isPastDate(start) && !isOpenCalendarStatus(status))
    ? "warning"
    : "ok"
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = (next.getUTCDay() + 6) % 7
  next.setUTCDate(next.getUTCDate() - day)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

export function getWeekVisibleRange(date: Date): CalendarDateRange {
  const start = startOfWeek(date)
  return {
    start: toDateRangeValue(start),
    end: toDateRangeValue(addDays(start, 7)),
  }
}

export function isSameDate(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  )
}

export function getEventDate(event: ColloquioCalendarEvent) {
  const date = new Date(event.start)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getCalendarEventStatusToken(event: ColloquioCalendarEvent) {
  return normalizeToken(
    event.type === "colloquio"
      ? [event.status, event.process?.stato_res, event.selection.stato_selezione].filter(Boolean).join(" ")
      : event.status,
  )
}

export function getCalendarEventStatusKey(event: ColloquioCalendarEvent): CalendarStatusKey {
  const statusToken = getCalendarEventStatusToken(event)
  if (statusToken.includes("no match") || statusToken.includes("nomatch")) return "no-match"
  if (statusToken.includes("match")) return "match"
  if (event.type === "prova" || statusToken.includes("prova")) return "prova"
  if (statusToken.includes("colloquio")) return "colloquio"
  return "standby"
}

export function getCalendarStatusRailClassName(statusKey: CalendarStatusKey) {
  switch (statusKey) {
    case "match":
      return "bg-emerald-800"
    case "prova":
      return "bg-emerald-500"
    case "no-match":
      return "bg-red-500"
    case "colloquio":
      return "bg-emerald-200"
    case "standby":
    default:
      return "bg-zinc-400"
  }
}
