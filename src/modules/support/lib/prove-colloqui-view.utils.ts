import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"

import type { ProvaCardData } from "../types"
import { DAY_LABELS, DISTRIBUTION_DAY_LABELS } from "./prove-colloqui-view.constants"

export function formatProvaDate(value: string | null | undefined) {
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

export function buildDistributionItems(source: string | null, totalHours: number | null) {
  const hourMatches = source?.match(/(\d+(?:[.,]\d+)?)h?/g) ?? []
  const parsed = hourMatches.map((item) =>
    Number.parseFloat(item.replace("h", "").replace(",", ".")),
  )

  if (parsed.length >= 7) {
    return DISTRIBUTION_DAY_LABELS.map((day, index) => ({
      day,
      value: `${Math.round(parsed[index] ?? 0)}h`,
    }))
  }

  if (typeof totalHours !== "number" || !Number.isFinite(totalHours)) {
    return DAY_LABELS.map((day) => ({ day, value: "-" }))
  }

  const base = Math.floor(totalHours / 6)
  const remainder = Math.round(totalHours - base * 6)
  return DAY_LABELS.map((day, index) => ({
    day,
    value: `${base + (index < remainder ? 1 : 0)}h`,
  }))
}

export function buildProvaWorkerCardItem(card: ProvaCardData): LavoratoreListItem {
  return {
    id: card.lavoratore?.id ?? card.rapporto.lavoratore_id ?? card.id,
    nomeCompleto: card.lavoratoreLabel,
    immagineUrl: card.workerAvatarUrl,
    locationLabel: null,
    telefono: card.lavoratore?.telefono ?? null,
    isBlacklisted: false,
    tipoRuolo: null,
    tipoRuoloColor: null,
    tipoLavoro: null,
    tipoLavoroColor: null,
    statoLavoratore: null,
    statoLavoratoreColor: null,
    disponibilita: null,
    disponibilitaColor: null,
    isDisponibile: null,
    isQualified: false,
    isIdoneo: false,
    isCertificato: false,
  }
}
