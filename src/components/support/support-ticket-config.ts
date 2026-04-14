import type { LucideIcon } from "lucide-react"
import {
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  CircleDotIcon,
  Clock3Icon,
  CreditCardIcon,
  FileQuestionIcon,
  FileTextIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  TriangleAlertIcon,
} from "lucide-react"

import type { TicketRecord } from "@/types"

export type SupportTicketType = "Customer" | "Payroll"

export type SupportTicketStatus =
  | "aperto"
  | "preso in carico"
  | "in attesa di info"
  | "in corso"
  | "chiuso"

export type SupportTicketUrgency = "Bassa" | "Media" | "Alta"

export type SupportTicketTag =
  | "Rapporto"
  | "Assunzione"
  | "Variazione"
  | "Chiusura"
  | "Documenti"
  | "Presenze"
  | "Cedolino"
  | "Contributi"
  | "Pagamenti"
  | "Altro"

export type SupportTicketMetadata = {
  tag?: string
  note?: string
  assegnatario?: string
} & Record<string, unknown>

export type SupportTicketStatusDefinition = {
  id: string
  label: string
  color: string
  badgeClassName: string
  icon: LucideIcon
}

export type SupportTicketTagDefinition = {
  id: string
  label: string
  colorClassName: string
  icon: LucideIcon
  supportedTypes: SupportTicketType[]
}

export type SupportTicketUrgencyDefinition = {
  id: string
  label: string
  colorClassName: string
  badgeClassName: string
  icon: LucideIcon
}

export const SUPPORT_TICKET_STATUSES: SupportTicketStatusDefinition[] = [
  {
    id: "aperto",
    label: "aperto",
    color: "sky",
    badgeClassName: "bg-badge-sky-bg text-badge-sky",
    icon: CircleDotIcon,
  },
  {
    id: "preso in carico",
    label: "preso in carico",
    color: "amber",
    badgeClassName: "bg-badge-amber-bg text-badge-amber",
    icon: Clock3Icon,
  },
  {
    id: "in attesa di info",
    label: "in attesa di info",
    color: "orange",
    badgeClassName: "bg-badge-orange-bg text-badge-orange",
    icon: CalendarClockIcon,
  },
  {
    id: "in corso",
    label: "in corso",
    color: "amber",
    badgeClassName: "bg-badge-amber-bg text-badge-amber",
    icon: Clock3Icon,
  },
  {
    id: "chiuso",
    label: "chiuso",
    color: "green",
    badgeClassName: "bg-badge-emerald-bg text-badge-emerald",
    icon: CircleCheckBigIcon,
  },
]

export const SUPPORT_TICKET_TAGS: SupportTicketTagDefinition[] = [
  {
    id: "Rapporto",
    label: "Rapporto",
    colorClassName: "bg-badge-sky-bg text-badge-sky",
    icon: BriefcaseBusinessIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Assunzione",
    label: "Assunzione",
    colorClassName: "bg-badge-cyan-bg text-badge-cyan",
    icon: LandmarkIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Variazione",
    label: "Variazione",
    colorClassName: "bg-badge-purple-bg text-badge-purple",
    icon: FileTextIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Chiusura",
    label: "Chiusura",
    colorClassName: "bg-badge-rose-bg text-badge-rose",
    icon: TriangleAlertIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Documenti",
    label: "Documenti",
    colorClassName: "bg-badge-gray-bg text-badge-gray",
    icon: FileQuestionIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Presenze",
    label: "Presenze",
    colorClassName: "bg-badge-cyan-bg text-badge-cyan",
    icon: CalendarClockIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Cedolino",
    label: "Cedolino",
    colorClassName: "bg-badge-blue-bg text-badge-blue",
    icon: CreditCardIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Contributi",
    label: "Contributi",
    colorClassName: "bg-badge-purple-bg text-badge-purple",
    icon: LandmarkIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Pagamenti",
    label: "Pagamenti",
    colorClassName: "bg-badge-emerald-bg text-badge-emerald",
    icon: ReceiptTextIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Altro",
    label: "Altro",
    colorClassName: "bg-badge-gray-bg text-badge-gray",
    icon: FileQuestionIcon,
    supportedTypes: ["Customer", "Payroll"],
  },
]

export const SUPPORT_TICKET_URGENCIES: SupportTicketUrgencyDefinition[] = [
  {
    id: "Bassa",
    label: "Bassa",
    colorClassName: "bg-badge-emerald-bg text-badge-emerald",
    badgeClassName: "bg-badge-emerald-bg text-badge-emerald",
    icon: AlertTriangleIcon,
  },
  {
    id: "Media",
    label: "Media",
    colorClassName: "bg-badge-amber-bg text-badge-amber",
    badgeClassName: "bg-badge-amber-bg text-badge-amber",
    icon: AlertTriangleIcon,
  },
  {
    id: "Alta",
    label: "Alta",
    colorClassName: "bg-badge-rose-bg text-badge-rose",
    badgeClassName: "bg-badge-rose-bg text-badge-rose",
    icon: AlertTriangleIcon,
  },
]

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

export function getSupportTicketMetadata(record: TicketRecord): SupportTicketMetadata {
  const metadata = record.metadati_migrazione
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as SupportTicketMetadata
  }
  return {}
}

export function mergeSupportTicketMetadata(
  record: TicketRecord,
  patch: Partial<SupportTicketMetadata>
): SupportTicketMetadata {
  return {
    ...getSupportTicketMetadata(record),
    ...patch,
  }
}

export function inferSupportTicketTag(record: TicketRecord): string {
  if (record.contributi_id) return "Contributi"
  if (record.cedolino_id) return "Cedolino"
  if (record.pagamenti_id) return "Pagamenti"
  if (record.presenze_id) return "Presenze"
  if (record.assunzione_id) return "Assunzione"
  if (record.variazione_id) return "Variazione"
  if (record.chiusura_id) return "Chiusura"
  if (record.rapporto_id) return "Rapporto"
  return "Altro"
}

export function resolveSupportTicketTag(rawTag: string | null | undefined) {
  const resolvedTag = toStringValue(rawTag)
  const definition = SUPPORT_TICKET_TAGS.find((item) => normalizeToken(item.id) === normalizeToken(resolvedTag))

  if (!definition) {
    throw new Error(`Tag ticket non riconosciuto: ${resolvedTag ?? "(vuoto)"}`)
  }

  return definition
}

export function resolveSupportTicketUrgency(rawUrgency: string | null | undefined) {
  const resolvedUrgency = toStringValue(rawUrgency)
  const definition = SUPPORT_TICKET_URGENCIES.find(
    (item) => normalizeToken(item.id) === normalizeToken(resolvedUrgency)
  )

  if (!definition) {
    throw new Error(`Urgenza ticket non riconosciuta: ${resolvedUrgency ?? "(vuoto)"}`)
  }

  return definition
}

export function resolveSupportTicketStatus(rawStatus: string | null | undefined) {
  const resolvedStatus = toStringValue(rawStatus)
  const definition = SUPPORT_TICKET_STATUSES.find(
    (item) => normalizeToken(item.id) === normalizeToken(resolvedStatus)
  )

  if (!definition) {
    throw new Error(`Stato ticket non riconosciuto: ${resolvedStatus ?? "(vuoto)"}`)
  }

  return definition
}

export function getSupportTicketTagsForType(ticketType: SupportTicketType) {
  return SUPPORT_TICKET_TAGS.filter((tag) => tag.supportedTypes.includes(ticketType))
}
