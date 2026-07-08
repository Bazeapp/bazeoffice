import type { ContributoQuarterValue } from "../types"

const QUARTER_ORDER: ContributoQuarterValue[] = ["Q1", "Q2", "Q3", "Q4"]

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
