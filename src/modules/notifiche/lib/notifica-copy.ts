export function notificaActionLabel(type: "menzione" | "risposta_thread"): string {
  return type === "menzione" ? "ti ha menzionato" : "ha risposto nel tuo thread"
}

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const created = new Date(iso)
  if (Number.isNaN(created.getTime())) return ""

  const diffMs = now.getTime() - created.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "adesso"
  if (minutes < 60) return `${minutes} min fa`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`

  const days = Math.floor(hours / 24)
  if (days === 1) return "ieri"
  if (days < 7) return `${days} giorni fa`
  if (days < 14) return "1 settimana fa"
  return `${Math.floor(days / 7)} settimane fa`
}
