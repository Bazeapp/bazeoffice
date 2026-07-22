import { normalizeLookupToken } from "@/lib/value-utils"

export type KanbanColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

const DEFAULT_KANBAN_COLUMN_VISUAL: KanbanColumnVisual = {
  columnClassName: "",
  headerClassName: "",
  iconClassName: "text-muted-foreground/80",
}

const KANBAN_COLUMN_COLOR_MAP: Record<string, KanbanColumnVisual> = {
  red: {
    columnClassName: "bg-red-400",
    headerClassName: "",
    iconClassName: "text-red-500",
  },
  rose: {
    columnClassName: "bg-rose-400",
    headerClassName: "",
    iconClassName: "text-rose-500",
  },
  orange: {
    columnClassName: "bg-orange-400",
    headerClassName: "",
    iconClassName: "text-orange-500",
  },
  amber: {
    columnClassName: "bg-amber-400",
    headerClassName: "",
    iconClassName: "text-amber-500",
  },
  yellow: {
    columnClassName: "bg-yellow-400",
    headerClassName: "",
    iconClassName: "text-yellow-500",
  },
  lime: {
    columnClassName: "bg-lime-400",
    headerClassName: "",
    iconClassName: "text-lime-500",
  },
  green: {
    columnClassName: "bg-green-400",
    headerClassName: "",
    iconClassName: "text-green-500",
  },
  emerald: {
    columnClassName: "bg-emerald-400",
    headerClassName: "",
    iconClassName: "text-emerald-500",
  },
  teal: {
    columnClassName: "bg-teal-400",
    headerClassName: "",
    iconClassName: "text-teal-500",
  },
  cyan: {
    columnClassName: "bg-cyan-400",
    headerClassName: "",
    iconClassName: "text-cyan-500",
  },
  sky: {
    columnClassName: "bg-sky-400",
    headerClassName: "",
    iconClassName: "text-sky-500",
  },
  blue: {
    columnClassName: "bg-blue-400",
    headerClassName: "",
    iconClassName: "text-blue-500",
  },
  indigo: {
    columnClassName: "bg-indigo-400",
    headerClassName: "",
    iconClassName: "text-indigo-500",
  },
  violet: {
    columnClassName: "bg-violet-400",
    headerClassName: "",
    iconClassName: "text-violet-500",
  },
  purple: {
    columnClassName: "bg-purple-400",
    headerClassName: "",
    iconClassName: "text-purple-500",
  },
  fuchsia: {
    columnClassName: "bg-fuchsia-400",
    headerClassName: "",
    iconClassName: "text-fuchsia-500",
  },
  pink: {
    columnClassName: "bg-pink-400",
    headerClassName: "",
    iconClassName: "text-pink-500",
  },
  slate: {
    columnClassName: "bg-slate-400",
    headerClassName: "",
    iconClassName: "text-slate-500",
  },
  gray: {
    columnClassName: "bg-gray-400",
    headerClassName: "",
    iconClassName: "text-gray-500",
  },
  zinc: {
    columnClassName: "bg-zinc-400",
    headerClassName: "",
    iconClassName: "text-zinc-500",
  },
}

/** Maps lookup palette tokens to kanban column chrome classes. */
export function getKanbanColumnVisual(color: string | null | undefined): KanbanColumnVisual {
  const token = normalizeLookupToken(color)
  if (!token) return DEFAULT_KANBAN_COLUMN_VISUAL

  return KANBAN_COLUMN_COLOR_MAP[token] ?? DEFAULT_KANBAN_COLUMN_VISUAL
}
