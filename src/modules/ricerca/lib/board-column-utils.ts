import {
  getKanbanColumnVisual,
  type KanbanColumnVisual,
} from "@/lib/kanban-column-utils"

function normalizeStageToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

export function normalizeRicercaStageToken(value: string) {
  return normalizeStageToken(value)
}

export function isDeferredRicercaStage(value: string) {
  const normalized = normalizeRicercaStageToken(value)
  return normalized === "match" || normalized === "no match"
}

/** Ricerca board columns: stage-specific shades, then shared kanban color fallback. */
export function getRicercaColumnVisual(
  columnId: string,
  columnLabel: string,
  color: string | null,
): KanbanColumnVisual {
  const token = normalizeStageToken(columnLabel || columnId)

  switch (token) {
    case "da assegnare":
      return { columnClassName: "bg-amber-300", headerClassName: "", iconClassName: "text-amber-400" }
    case "fare ricerca":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "in preparazione per invio":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" }
    case "inviare selezione":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "selezione inviata":
    case "selezione inviata in attesa di feedback":
      return { columnClassName: "bg-emerald-300", headerClassName: "", iconClassName: "text-emerald-400" }
    case "fase di colloqui":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" }
    case "in prova con lavoratore":
      return { columnClassName: "bg-emerald-500", headerClassName: "", iconClassName: "text-emerald-600" }
    case "match":
      return { columnClassName: "bg-emerald-600", headerClassName: "", iconClassName: "text-emerald-700" }
    case "no match":
      return { columnClassName: "bg-red-400", headerClassName: "", iconClassName: "text-red-500" }
    case "stand by":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" }
    default:
      return getKanbanColumnVisual(color)
  }
}
