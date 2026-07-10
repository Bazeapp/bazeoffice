import { normalizeLookupToken } from "@/lib/value-utils"

import type { LookupOptionsByField } from "../types"

export function groupStageOptions(options: LookupOptionsByField["stato_sales"]) {
  return options.reduce<Record<string, LookupOptionsByField["stato_sales"]>>(
    (acc, option) => {
      const normalized = normalizeLookupToken(option.valueKey)
      const groupKey = normalized.startsWith("warm_")
        ? "warm"
        : normalized.startsWith("hot_")
          ? "hot"
          : normalized.startsWith("cold_")
            ? "cold"
            : normalized.startsWith("won_")
              ? "won"
              : normalized === "lost"
                ? "lost"
                : normalized === "out_of_target"
                  ? "out_of_target"
                  : "other"

      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(option)
      return acc
    },
    {}
  )
}

export function getStageDotClass(stage: string | null | undefined) {
  const s = String(stage ?? "").toLowerCase()
  if (s.startsWith("warm_")) return "bg-amber-400"
  if (s.startsWith("hot_")) return "bg-red-500"
  if (s.startsWith("cold_")) return "bg-sky-400"
  if (s.startsWith("won_")) return "bg-emerald-500"
  if (s === "lost") return "bg-zinc-400"
  if (s === "out_of_target") return "bg-zinc-300"
  return "bg-muted-foreground/60"
}

export function getStageGroupLabel(groupKey: string) {
  switch (groupKey) {
    case "warm":
      return "WARM"
    case "hot":
      return "HOT"
    case "cold":
      return "COLD"
    case "won":
      return "WON"
    case "lost":
      return "LOST"
    case "out_of_target":
      return "OUT OF TARGET"
    default:
      return "Altri"
  }
}

export const STAGE_GROUP_ORDER = [
  "warm",
  "hot",
  "cold",
  "won",
  "lost",
  "out_of_target",
  "other",
] as const

export function getOrderedStageGroups(
  groupedStageOptions: Record<string, LookupOptionsByField["stato_sales"]>
) {
  return STAGE_GROUP_ORDER.filter(
    (groupKey) => (groupedStageOptions[groupKey] ?? []).length > 0
  )
}
