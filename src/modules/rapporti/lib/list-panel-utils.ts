import { getSortableTimestamp } from "@/lib/value-utils"

export type RapportiListItem = {
  id: string
  famigliaLabel: string
  lavoratoreLabel: string
  stato_rapporto: string | null
  stato_servizio: string | null
  stato_assunzione: string | null
  stato_riattivazione: string | null
  tipo_contratto: string | null
  tipo_rapporto: string | null
  ore_a_settimana: number | null
  data_inizio_rapporto: string | null
  distribuzione_ore_settimana: string | null
  raw: import("@/types").RapportoLavorativoRecord
}

const RAPPORTO_STATUS_OPTIONS = ["In attivazione", "Attivo", "Terminato", "Sconosciuto", "Errore"] as const

export { RAPPORTO_STATUS_OPTIONS }

const RAPPORTO_STATUS_WEIGHT = new Map<string, number>(
  RAPPORTO_STATUS_OPTIONS.map((status, index) => [status, index]),
)

export function formatCompactDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function sortItems(
  items: RapportiListItem[],
  sorting: Array<{ id: string; desc: boolean }>,
) {
  if (sorting.length === 0) return items

  const nextItems = [...items]
  nextItems.sort((left, right) => {
    for (const sort of sorting) {
      const leftValue = left[sort.id as keyof RapportiListItem]
      const rightValue = right[sort.id as keyof RapportiListItem]

      let comparison = 0
      if (typeof leftValue === "number" || typeof rightValue === "number") {
        comparison = (Number(leftValue) || 0) - (Number(rightValue) || 0)
      } else {
        comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""))
      }

      if (comparison !== 0) {
        return sort.desc ? -comparison : comparison
      }
    }

    return 0
  })

  return nextItems
}

function getStatusWeight(value: string | null | undefined) {
  return RAPPORTO_STATUS_WEIGHT.get(value ?? "") ?? RAPPORTO_STATUS_OPTIONS.length
}

export function sortByOperationalStatus(items: RapportiListItem[]) {
  return [...items].sort((left, right) => {
    const statusDelta = getStatusWeight(left.stato_rapporto) - getStatusWeight(right.stato_rapporto)
    if (statusDelta !== 0) return statusDelta

    const dateDelta =
      getSortableTimestamp(right.data_inizio_rapporto) -
      getSortableTimestamp(left.data_inizio_rapporto)
    if (dateDelta !== 0) return dateDelta

    return left.famigliaLabel.localeCompare(right.famigliaLabel)
  })
}
