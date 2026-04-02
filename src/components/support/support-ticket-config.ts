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
  | "Aperto"
  | "In lavorazione"
  | "In attesa cliente"
  | "Risolto"

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

export const DEFAULT_SUPPORT_TICKET_STATUSES: SupportTicketStatusDefinition[] = [
  {
    id: "Aperto",
    label: "Aperto",
    color: "sky",
    badgeClassName: "bg-sky-100 text-sky-700 hover:bg-sky-100",
    icon: CircleDotIcon,
  },
  {
    id: "In lavorazione",
    label: "In lavorazione",
    color: "amber",
    badgeClassName: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    icon: Clock3Icon,
  },
  {
    id: "In attesa cliente",
    label: "In attesa cliente",
    color: "orange",
    badgeClassName: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    icon: CalendarClockIcon,
  },
  {
    id: "Risolto",
    label: "Risolto",
    color: "green",
    badgeClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    icon: CircleCheckBigIcon,
  },
]

export const SUPPORT_TICKET_TAGS: SupportTicketTagDefinition[] = [
  {
    id: "Rapporto",
    label: "Rapporto",
    colorClassName: "bg-sky-100 text-sky-700 hover:bg-sky-100",
    icon: BriefcaseBusinessIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Assunzione",
    label: "Assunzione",
    colorClassName: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
    icon: LandmarkIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Variazione",
    label: "Variazione",
    colorClassName: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    icon: FileTextIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Chiusura",
    label: "Chiusura",
    colorClassName: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    icon: TriangleAlertIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Documenti",
    label: "Documenti",
    colorClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    icon: FileQuestionIcon,
    supportedTypes: ["Customer"],
  },
  {
    id: "Presenze",
    label: "Presenze",
    colorClassName: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
    icon: CalendarClockIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Cedolino",
    label: "Cedolino",
    colorClassName: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
    icon: CreditCardIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Contributi",
    label: "Contributi",
    colorClassName: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    icon: LandmarkIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Pagamenti",
    label: "Pagamenti",
    colorClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    icon: ReceiptTextIcon,
    supportedTypes: ["Payroll"],
  },
  {
    id: "Altro",
    label: "Altro",
    colorClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    icon: FileQuestionIcon,
    supportedTypes: ["Customer", "Payroll"],
  },
]

export const SUPPORT_TICKET_URGENCIES: SupportTicketUrgencyDefinition[] = [
  {
    id: "Bassa",
    label: "Bassa",
    colorClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    badgeClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    icon: AlertTriangleIcon,
  },
  {
    id: "Media",
    label: "Media",
    colorClassName: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    badgeClassName: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    icon: AlertTriangleIcon,
  },
  {
    id: "Alta",
    label: "Alta",
    colorClassName: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    badgeClassName: "bg-rose-100 text-rose-700 hover:bg-rose-100",
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

  if (definition) return definition

  return {
    id: resolvedTag ?? "Altro",
    label: resolvedTag ?? "Altro",
    colorClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    icon: FileQuestionIcon,
    supportedTypes: ["Customer", "Payroll"] as SupportTicketType[],
  }
}

export function resolveSupportTicketUrgency(rawUrgency: string | null | undefined) {
  const resolvedUrgency = toStringValue(rawUrgency)
  const definition = SUPPORT_TICKET_URGENCIES.find(
    (item) => normalizeToken(item.id) === normalizeToken(resolvedUrgency)
  )

  if (definition) return definition

  return {
    id: resolvedUrgency ?? "Media",
    label: resolvedUrgency ?? "Media",
    colorClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    badgeClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    icon: AlertTriangleIcon,
  }
}

export function resolveSupportTicketStatus(rawStatus: string | null | undefined) {
  const resolvedStatus = toStringValue(rawStatus)
  const definition = DEFAULT_SUPPORT_TICKET_STATUSES.find(
    (item) => normalizeToken(item.id) === normalizeToken(resolvedStatus)
  )

  if (definition) return definition

  return {
    id: resolvedStatus ?? "Aperto",
    label: resolvedStatus ?? "Aperto",
    color: "zinc",
    badgeClassName: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    icon: CircleDotIcon,
  }
}

export function getSupportTicketTagsForType(ticketType: SupportTicketType) {
  return SUPPORT_TICKET_TAGS.filter((tag) => tag.supportedTypes.includes(ticketType))
}
