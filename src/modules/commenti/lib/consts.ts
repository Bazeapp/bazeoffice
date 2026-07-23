import type { CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { EntityType } from "../types/entity"
import type { OperatorRoleToken } from "../types/operator"

export const ENTITY_TYPES = [
  "famiglia",
  "lavoratore",
  "ricerca",
  "candidatura",
  "rapporto",
  "assunzione",
  "variazione",
  "chiusura",
  "cedolino",
  "contributi",
  "ticket",
] as const satisfies readonly EntityType[]

export const COMMENT_TYPES = ["free", "phase_note"] as const satisfies readonly CommentType[]

export const PHASE_LABELS = ["gate_1", "gate_2"] as const satisfies readonly PhaseLabel[]

export const OPERATOR_ROLE_TOKENS = [
  "customer",
  "sales",
  "recruiter",
  "payroll",
] as const satisfies readonly OperatorRoleToken[]

export const SOURCE_INTERFACES = [
  "kanban_famiglie",
  "assegnazione_famiglie",
  "dettaglio_ricerca",
  "pipeline_ricerca",
  "dettaglio_lavoratore_ricerca",
  "cerca_lavoratore",
  "gate_1",
  "gate_2",
  "rapporti_lavorativi",
  "assunzioni",
  "chiusure",
  "variazioni",
  "cedolini",
  "contributi_inps",
  "ticket_customer",
  "ticket_payroll",
  "centro_notifiche",
] as const satisfies readonly SourceInterface[]

export const ENTITY_TYPE_TO_TABLE: Record<EntityType, string> = {
  famiglia: "famiglie",
  lavoratore: "lavoratori",
  ricerca: "processi_matching",
  candidatura: "selezioni_lavoratori",
  rapporto: "rapporti_lavorativi",
  assunzione: "assunzioni",
  variazione: "variazioni_contrattuali",
  chiusura: "chiusure_contratti",
  cedolino: "mesi_lavorati",
  contributi: "contributi_inps",
  ticket: "ticket",
}

export const ENTITY_SECTION_META: Record<
  EntityType,
  { typeLabel: string; icon: string }
> = {
  famiglia: { typeLabel: "FAMIGLIA", icon: "🏠" },
  lavoratore: { typeLabel: "LAVORATORE", icon: "👤" },
  ricerca: { typeLabel: "RICERCA", icon: "🔍" },
  candidatura: { typeLabel: "CANDIDATURA", icon: "🎯" },
  rapporto: { typeLabel: "RAPPORTO", icon: "💼" },
  assunzione: { typeLabel: "ASSUNZIONE", icon: "📄" },
  variazione: { typeLabel: "VARIAZIONE", icon: "📄" },
  chiusura: { typeLabel: "CHIUSURA", icon: "📄" },
  cedolino: { typeLabel: "CEDOLINO", icon: "📄" },
  contributi: { typeLabel: "CONTRIBUTI", icon: "📄" },
  ticket: { typeLabel: "TICKET", icon: "📄" },
}

/** Tie-break when ancestor sections share the same depth from focus. */
export const ANCESTOR_SECTION_ORDER: EntityType[] = [
  "candidatura",
  "rapporto",
  "lavoratore",
  "ricerca",
  "famiglia",
  "assunzione",
  "variazione",
  "chiusura",
  "cedolino",
  "contributi",
  "ticket",
]

export const ROLE_PILL_LABELS: Record<OperatorRoleToken, string> = {
  customer: "Customer",
  sales: "Sales",
  recruiter: "Recruiter",
  payroll: "Payroll",
}

export const ROLE_PRECEDENCE: OperatorRoleToken[] = [
  "recruiter",
  "customer",
  "sales",
  "payroll",
]
