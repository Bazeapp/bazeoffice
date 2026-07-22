export function formatChiusuraDisplayDate(value: string | null | undefined) {
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

export function getLicenziamentoVariant(label: string | null | undefined) {
  const normalized = String(label ?? "").toLowerCase()
  if (normalized.includes("prova")) {
    return "bg-amber-100 text-amber-700"
  }
  if (normalized.includes("preavviso")) {
    return "bg-sky-100 text-sky-700"
  }
  if (normalized.includes("decesso")) {
    return "bg-rose-100 text-rose-700"
  }
  return "bg-muted text-foreground"
}

export function getLookupBadgeClasses(color: string | null | undefined) {
  switch (String(color ?? "").toLowerCase()) {
    case "sky":
    case "cyan":
      return "bg-sky-100 text-sky-700"
    case "teal":
      return "bg-teal-100 text-teal-700"
    case "lime":
    case "green":
      return "bg-green-100 text-green-700"
    case "amber":
    case "yellow":
      return "bg-amber-100 text-amber-700"
    case "orange":
      return "bg-orange-100 text-orange-700"
    case "red":
    case "rose":
    case "pink":
      return "bg-rose-100 text-rose-700"
    case "violet":
    case "purple":
      return "bg-violet-100 text-violet-700"
    case "zinc":
    case "gray":
    case "grey":
      return "bg-zinc-100 text-zinc-700"
    default:
      return "bg-muted text-foreground"
  }
}
