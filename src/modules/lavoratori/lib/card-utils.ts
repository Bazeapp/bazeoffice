import type { LavoratoreListItem } from "../components/lavoratore-card"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { formatItalianDateTime } from "@/lib/value-utils"

const DEFAULT_BLUE_BADGE_CLASS_NAME = "border-blue-200 bg-blue-100 text-blue-700"

export function getWorkerCardBadgeClassName(color: string | null | undefined) {
  void color
  return DEFAULT_BLUE_BADGE_CLASS_NAME
}

export function getWorkerStatusSoftClassName(
  workerColor: string | null | undefined,
  statusLabel: string,
) {
  if (workerColor) return getLookupBadgeSoftClassName(workerColor)
  void statusLabel
  return DEFAULT_BLUE_BADGE_CLASS_NAME
}

export function formatYearsLabel(value: number) {
  if (Number.isInteger(value)) return `${value} anni`
  return `${value.toFixed(1).replace(".", ",")} anni`
}

export function getExperienceLevel(value: number) {
  if (!Number.isFinite(value)) {
    return { activeSegments: 0, segmentClassName: "bg-muted-foreground/30" }
  }
  if (value < 2) {
    return { activeSegments: 1, segmentClassName: "bg-orange-500" }
  }
  if (value <= 8) {
    return { activeSegments: 2, segmentClassName: "bg-green-500" }
  }
  return { activeSegments: 3, segmentClassName: "bg-emerald-600" }
}

export function formatOtherSelectionsLabel(count: number) {
  if (count === 1) return "1 altra selezione"
  return `${count} altre selezioni`
}

export function formatTravelTimeLabel(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return null
  return `${Math.round(minutes)} min`
}

export function formatCreatedAtLabel(value: string | null | undefined) {
  if (!value) return "-"
  return formatItalianDateTime(value)
}

export function getWorkerCardInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export type WorkerCardSummary = Pick<
  LavoratoreListItem,
  "isCertificato" | "isIdoneo" | "isQualified"
>
