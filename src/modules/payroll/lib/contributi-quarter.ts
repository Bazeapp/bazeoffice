import type { ContributiPeriod, ContributoQuarterValue } from "../types"

import { normalizeComparableToken } from "@/lib/value-utils"

export const QUARTER_ORDER: ContributoQuarterValue[] = ["Q1", "Q2", "Q3", "Q4"]

export function getQuarterValueFromDate(value: string | null | undefined): ContributoQuarterValue | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const month = date.getUTCMonth()
  if (month <= 2) return "Q1"
  if (month <= 5) return "Q2"
  if (month <= 8) return "Q3"
  return "Q4"
}

export function getYearFromDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCFullYear()
}

export function parseQuarterReference(
  value: string | null | undefined,
): { quarter: ContributoQuarterValue; year: number } | null {
  const normalized = normalizeComparableToken(value)
  if (!normalized) return null

  const quarterMatch =
    normalized.match(/\bq\s*([1-4])\b/i) ??
    normalized.match(/\btrimestre\s*([1-4])\b/i) ??
    normalized.match(/\b([1-4])\s*trimestre\b/i)
  const yearMatch = normalized.match(/\b(20\d{2})\b/)

  if (!quarterMatch?.[1] || !yearMatch?.[1]) return null

  return {
    quarter: `Q${quarterMatch[1]}` as ContributoQuarterValue,
    year: Number(yearMatch[1]),
  }
}

export function formatQuarterLabel(
  quarter: ContributoQuarterValue | null,
  year: number | null,
  fallback: string | null | undefined,
) {
  if (quarter && year) return `${quarter} ${year}`
  return fallback?.trim() || "Trimestre non disponibile"
}

export function getCurrentQuarterState(): ContributiPeriod {
  const now = new Date()
  const quarter = getQuarterValueFromDate(now.toISOString()) ?? "Q1"
  const year = getYearFromDate(now.toISOString()) ?? now.getUTCFullYear()
  return { quarter, year }
}

export function shiftQuarter(period: ContributiPeriod, delta: number): ContributiPeriod {
  const currentIndex = QUARTER_ORDER.indexOf(period.quarter)
  let nextIndex = currentIndex + delta
  let nextYear = period.year

  if (nextIndex < 0) {
    nextIndex = QUARTER_ORDER.length - 1
    nextYear -= 1
  }

  if (nextIndex >= QUARTER_ORDER.length) {
    nextIndex = 0
    nextYear += 1
  }

  return {
    quarter: QUARTER_ORDER[nextIndex] ?? "Q1",
    year: nextYear,
  }
}

export function getQuarterDateRange(year: number, quarter: ContributoQuarterValue) {
  const quarterIndex = QUARTER_ORDER.indexOf(quarter)
  if (quarterIndex < 0) return null

  const startMonth = quarterIndex * 3
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0))

  return {
    start: start.toISOString(),
    end: new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    ).toISOString(),
  }
}
