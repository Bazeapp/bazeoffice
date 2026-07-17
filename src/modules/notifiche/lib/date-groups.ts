export type DateGroupLabel = "OGGI" | "IERI" | "QUESTA SETTIMANA" | "PRIMA"

export type DateGroupedItems<T> = {
  label: DateGroupLabel
  items: T[]
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()
  return Math.round(ms / 86_400_000)
}

export function dateGroupLabelFor(
  createdAt: string,
  now: Date = new Date(),
): DateGroupLabel {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return "PRIMA"

  const deltaDays = daysBetween(now, created)
  if (deltaDays <= 0) return "OGGI"
  if (deltaDays === 1) return "IERI"
  if (deltaDays < 7) return "QUESTA SETTIMANA"
  return "PRIMA"
}

const GROUP_ORDER: DateGroupLabel[] = [
  "OGGI",
  "IERI",
  "QUESTA SETTIMANA",
  "PRIMA",
]

export function groupNotificheByDate<T extends { createdAt: string }>(
  items: T[],
  now: Date = new Date(),
): DateGroupedItems<T>[] {
  const buckets = new Map<DateGroupLabel, T[]>()
  for (const label of GROUP_ORDER) {
    buckets.set(label, [])
  }

  for (const item of items) {
    const label = dateGroupLabelFor(item.createdAt, now)
    buckets.get(label)?.push(item)
  }

  return GROUP_ORDER.flatMap((label) => {
    const groupItems = buckets.get(label) ?? []
    return groupItems.length > 0 ? [{ label, items: groupItems }] : []
  })
}
