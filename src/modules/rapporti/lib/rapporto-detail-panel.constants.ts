import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react"
import type * as React from "react"

export type RapportoDetailSectionTab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const RAPPORTO_DETAIL_SECTION_TABS: RapportoDetailSectionTab[] = [
  { id: "contratto", label: "Contratto", icon: BriefcaseBusinessIcon },
  { id: "preventivo", label: "Preventivo", icon: FileTextIcon },
  { id: "gestione", label: "Datore e Lavoratore", icon: UsersIcon },
  { id: "tickets", label: "Tickets", icon: MessageSquareTextIcon },
  { id: "cedolini", label: "Cedolini", icon: CreditCardIcon },
  { id: "contributi", label: "Contributi", icon: CalendarDaysIcon },
  { id: "variazioni", label: "Variazioni", icon: RefreshCwIcon },
  { id: "chiusure", label: "Chiusure", icon: TriangleAlertIcon },
]

export const SCONTO_APPLICATO_OPTIONS = ["50%", "prova_gratuita", "100€"] as const

export const PAYROLL_STAGE_OPTIONS = [
  "TODO",
  "Inviate richiesta presenze",
  "Follow up richiesta presenze",
  "Followup fatti",
  "Problema in comunicazione presenze",
  "Ricezione presenze",
  "Cedolino da controllare",
  "Cedolino Pronto",
  "Inviato cedolino",
  "Richiesta chiarimenti",
  "Pagato",
] as const

export const CONTRIBUTI_STAGE_OPTIONS = [
  { id: "Da richiedere", label: "Da richiedere", color: "sky" },
  { id: "PagoPA ricevuto", label: "PagoPA ricevuto", color: "cyan" },
  { id: "Inviato alla famiglia", label: "Inviato alla famiglia", color: "amber" },
  { id: "Pagato", label: "Pagato", color: "green" },
] as const

export const CONTRIBUTI_LEGACY_STAGE_ALIASES: Record<string, string> = {
  todo: "Da richiedere",
  "to do": "Da richiedere",
  inviato: "Inviato alla famiglia",
  "inviato alla famiglia": "Inviato alla famiglia",
  "inviato pagopa": "Inviato alla famiglia",
  inviati: "Inviato alla famiglia",
  pagopa: "PagoPA ricevuto",
  "pagopa ricevuto": "PagoPA ricevuto",
  done: "Pagato",
  pagato: "Pagato",
}

export const ATTACHMENT_SKELETON_KEYS = ["accordo", "ricevuta", "delega"] as const
export const LINKED_ROW_SKELETON_KEYS = ["first", "second", "third"] as const
