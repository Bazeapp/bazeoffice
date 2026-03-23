const SEMANTIC_COLOR_ALIASES: Record<string, string> = {
  positive: "emerald",
  negative: "rose",
  neutral: "sky",
  muted: "zinc",
}

type ColorStyleSet = {
  badgeSoft: string
  panel: string
  text: string
  dropZone: string
  dropZoneActive: string
}

const COLOR_STYLE_MAP: Record<string, ColorStyleSet> = {
  red: {
    badgeSoft: "border-red-200 bg-red-100 text-red-700",
    panel: "border-red-300 bg-red-50/70",
    text: "text-red-700",
    dropZone: "border-red-300/90 bg-red-50/45 text-red-800",
    dropZoneActive: "border-red-500 bg-red-100/70",
  },
  rose: {
    badgeSoft: "border-rose-200 bg-rose-100 text-rose-700",
    panel: "border-rose-300 bg-rose-50/70",
    text: "text-rose-700",
    dropZone: "border-rose-300/90 bg-rose-50/45 text-rose-800",
    dropZoneActive: "border-rose-500 bg-rose-100/70",
  },
  orange: {
    badgeSoft: "border-orange-200 bg-orange-100 text-orange-700",
    panel: "border-orange-300 bg-orange-50/70",
    text: "text-orange-700",
    dropZone: "border-orange-300/90 bg-orange-50/45 text-orange-800",
    dropZoneActive: "border-orange-500 bg-orange-100/70",
  },
  amber: {
    badgeSoft: "border-amber-200 bg-amber-100 text-amber-700",
    panel: "border-amber-300 bg-amber-50/70",
    text: "text-amber-700",
    dropZone: "border-amber-300/90 bg-amber-50/45 text-amber-800",
    dropZoneActive: "border-amber-500 bg-amber-100/70",
  },
  yellow: {
    badgeSoft: "border-yellow-200 bg-yellow-100 text-yellow-700",
    panel: "border-yellow-300 bg-yellow-50/70",
    text: "text-yellow-700",
    dropZone: "border-yellow-300/90 bg-yellow-50/45 text-yellow-800",
    dropZoneActive: "border-yellow-500 bg-yellow-100/70",
  },
  lime: {
    badgeSoft: "border-lime-200 bg-lime-100 text-lime-700",
    panel: "border-lime-300 bg-lime-50/70",
    text: "text-lime-700",
    dropZone: "border-lime-300/90 bg-lime-50/45 text-lime-800",
    dropZoneActive: "border-lime-500 bg-lime-100/70",
  },
  green: {
    badgeSoft: "border-green-200 bg-green-100 text-green-700",
    panel: "border-green-300 bg-green-50/70",
    text: "text-green-700",
    dropZone: "border-green-300/90 bg-green-50/45 text-green-800",
    dropZoneActive: "border-green-500 bg-green-100/70",
  },
  emerald: {
    badgeSoft: "border-emerald-200 bg-emerald-100 text-emerald-700",
    panel: "border-emerald-300 bg-emerald-50/70",
    text: "text-emerald-700",
    dropZone: "border-emerald-300/90 bg-emerald-50/45 text-emerald-800",
    dropZoneActive: "border-emerald-500 bg-emerald-100/70",
  },
  teal: {
    badgeSoft: "border-teal-200 bg-teal-100 text-teal-700",
    panel: "border-teal-300 bg-teal-50/70",
    text: "text-teal-700",
    dropZone: "border-teal-300/90 bg-teal-50/45 text-teal-800",
    dropZoneActive: "border-teal-500 bg-teal-100/70",
  },
  cyan: {
    badgeSoft: "border-cyan-200 bg-cyan-100 text-cyan-700",
    panel: "border-cyan-300 bg-cyan-50/70",
    text: "text-cyan-700",
    dropZone: "border-cyan-300/90 bg-cyan-50/45 text-cyan-800",
    dropZoneActive: "border-cyan-500 bg-cyan-100/70",
  },
  sky: {
    badgeSoft: "border-sky-200 bg-sky-100 text-sky-700",
    panel: "border-sky-300 bg-sky-50/70",
    text: "text-sky-700",
    dropZone: "border-sky-300/90 bg-sky-50/45 text-sky-800",
    dropZoneActive: "border-sky-500 bg-sky-100/70",
  },
  blue: {
    badgeSoft: "border-blue-200 bg-blue-100 text-blue-700",
    panel: "border-blue-300 bg-blue-50/70",
    text: "text-blue-700",
    dropZone: "border-blue-300/90 bg-blue-50/45 text-blue-800",
    dropZoneActive: "border-blue-500 bg-blue-100/70",
  },
  indigo: {
    badgeSoft: "border-indigo-200 bg-indigo-100 text-indigo-700",
    panel: "border-indigo-300 bg-indigo-50/70",
    text: "text-indigo-700",
    dropZone: "border-indigo-300/90 bg-indigo-50/45 text-indigo-800",
    dropZoneActive: "border-indigo-500 bg-indigo-100/70",
  },
  violet: {
    badgeSoft: "border-violet-200 bg-violet-100 text-violet-700",
    panel: "border-violet-300 bg-violet-50/70",
    text: "text-violet-700",
    dropZone: "border-violet-300/90 bg-violet-50/45 text-violet-800",
    dropZoneActive: "border-violet-500 bg-violet-100/70",
  },
  purple: {
    badgeSoft: "border-purple-200 bg-purple-100 text-purple-700",
    panel: "border-purple-300 bg-purple-50/70",
    text: "text-purple-700",
    dropZone: "border-purple-300/90 bg-purple-50/45 text-purple-800",
    dropZoneActive: "border-purple-500 bg-purple-100/70",
  },
  fuchsia: {
    badgeSoft: "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700",
    panel: "border-fuchsia-300 bg-fuchsia-50/70",
    text: "text-fuchsia-700",
    dropZone: "border-fuchsia-300/90 bg-fuchsia-50/45 text-fuchsia-800",
    dropZoneActive: "border-fuchsia-500 bg-fuchsia-100/70",
  },
  pink: {
    badgeSoft: "border-pink-200 bg-pink-100 text-pink-700",
    panel: "border-pink-300 bg-pink-50/70",
    text: "text-pink-700",
    dropZone: "border-pink-300/90 bg-pink-50/45 text-pink-800",
    dropZoneActive: "border-pink-500 bg-pink-100/70",
  },
  slate: {
    badgeSoft: "border-slate-200 bg-slate-100 text-slate-700",
    panel: "border-slate-300 bg-slate-50/70",
    text: "text-slate-700",
    dropZone: "border-slate-300/90 bg-slate-50/45 text-slate-800",
    dropZoneActive: "border-slate-500 bg-slate-100/70",
  },
  gray: {
    badgeSoft: "border-gray-200 bg-gray-100 text-gray-700",
    panel: "border-gray-300 bg-gray-50/70",
    text: "text-gray-700",
    dropZone: "border-gray-300/90 bg-gray-50/45 text-gray-800",
    dropZoneActive: "border-gray-500 bg-gray-100/70",
  },
  zinc: {
    badgeSoft: "border-zinc-200 bg-zinc-100 text-zinc-700",
    panel: "border-zinc-300 bg-zinc-50/70",
    text: "text-zinc-700",
    dropZone: "border-zinc-300/90 bg-zinc-50/45 text-zinc-800",
    dropZoneActive: "border-zinc-500 bg-zinc-100/70",
  },
  neutral: {
    badgeSoft: "border-neutral-200 bg-neutral-100 text-neutral-700",
    panel: "border-neutral-300 bg-neutral-50/70",
    text: "text-neutral-700",
    dropZone: "border-neutral-300/90 bg-neutral-50/45 text-neutral-800",
    dropZoneActive: "border-neutral-500 bg-neutral-100/70",
  },
  stone: {
    badgeSoft: "border-stone-200 bg-stone-100 text-stone-700",
    panel: "border-stone-300 bg-stone-50/70",
    text: "text-stone-700",
    dropZone: "border-stone-300/90 bg-stone-50/45 text-stone-800",
    dropZoneActive: "border-stone-500 bg-stone-100/70",
  },
  white: {
    badgeSoft: "border-border bg-white text-foreground",
    panel: "border-border bg-white",
    text: "text-foreground",
    dropZone: "border-border/70 bg-background/45 text-foreground",
    dropZoneActive: "border-primary/70 bg-primary/12",
  },
}

const DEFAULT_STYLES: ColorStyleSet = {
  badgeSoft: "border-border bg-muted text-foreground",
  panel: "border-border bg-muted/40",
  text: "text-foreground",
  dropZone: "border-border/70 bg-background/45 text-foreground",
  dropZoneActive: "border-primary/70 bg-primary/12",
}

function normalizeColorToken(color: string | null | undefined) {
  const raw = String(color ?? "").trim().toLowerCase()
  if (!raw) return ""
  return SEMANTIC_COLOR_ALIASES[raw] ?? raw
}

function resolveColorStyles(color: string | null | undefined) {
  const token = normalizeColorToken(color)
  return COLOR_STYLE_MAP[token] ?? DEFAULT_STYLES
}

export function getLookupBadgeSoftClassName(color: string | null | undefined) {
  return resolveColorStyles(color).badgeSoft
}

export function getLookupPanelClassName(color: string | null | undefined) {
  return resolveColorStyles(color).panel
}

export function getLookupToneTextClassName(color: string | null | undefined) {
  return resolveColorStyles(color).text
}

export function getLookupDropZoneClassName(color: string | null | undefined) {
  return resolveColorStyles(color).dropZone
}

export function getLookupDropZoneActiveClassName(color: string | null | undefined) {
  return resolveColorStyles(color).dropZoneActive
}
