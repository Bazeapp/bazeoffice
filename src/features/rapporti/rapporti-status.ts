function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
}

function isBeforeToday(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() < today.getTime()
}

type RapportoStatusInput = {
  stato_assunzione?: string | null
  data_fine_rapporto?: string | null
}

export function resolveRapportoStatus(
  rapporto: RapportoStatusInput | null | undefined,
  dataFineRapporto = rapporto?.data_fine_rapporto
) {
  const hiringStatus = normalizeToken(rapporto?.stato_assunzione)
  const ended = isBeforeToday(dataFineRapporto)

  if (
    hiringStatus === "assunzione fatta" ||
    hiringStatus === "documenti assunzione inviati" ||
    hiringStatus === "contratto firmato"
  ) {
    return ended ? "Terminato" : "Attivo"
  }

  if (
    hiringStatus === "avviare pratica" ||
    hiringStatus === "inviata richiesta dati" ||
    hiringStatus === "in attesa di dati famiglia" ||
    hiringStatus === "in attesa di dati lavoratore" ||
    hiringStatus === "dati pronti per assunzione"
  ) {
    return "In attivazione"
  }

  if (hiringStatus === "non assume con baze") return "Sconosciuto"

  return "Errore"
}

export function getRapportoStatusColor(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token || token === "sconosciuto") return "zinc"
  if (token.includes("attivazione")) return "amber"
  if (token.includes("attivo") && !token.includes("non")) return "emerald"
  if (token.includes("terminato") || token.includes("chius") || token.includes("cess")) {
    return "zinc"
  }
  if (token.includes("errore")) return "rose"
  return "sky"
}
