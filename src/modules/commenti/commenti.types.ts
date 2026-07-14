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
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export const COMMENT_TYPES = ["free", "phase_note"] as const
export type CommentType = (typeof COMMENT_TYPES)[number]

export const PHASE_LABELS = ["gate_1", "gate_2"] as const
export type PhaseLabel = (typeof PHASE_LABELS)[number]

export const OPERATOR_ROLE_TOKENS = [
  "customer",
  "sales",
  "recruiter",
  "payroll",
] as const

export type OperatorRoleToken = (typeof OPERATOR_ROLE_TOKENS)[number]

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
] as const

export type SourceInterface = (typeof SOURCE_INTERFACES)[number]

export type EntityRef = {
  entityType: EntityType
  entityId: string
}

export type CommentSectionKind = "focus" | "ancestor" | "descendants"

export type CommentSection = {
  id: string
  kind: CommentSectionKind
  entityRef: EntityRef | null
  typeLabel: string
  displayName: string
  icon: string
}

export type CommentAuthor = {
  id: string
  name: string
  rolePill: string
  isDeactivated: boolean
}

export type Comment = {
  id: string
  threadRootId: string | null
  anchor: EntityRef
  author: CommentAuthor
  body: string
  commentType: CommentType
  phaseLabel: PhaseLabel | null
  sourceInterface: SourceInterface | null
  createdAt: string
  editedAt: string | null
  isUnread: boolean
  replyCount: number
  replies: Comment[]
}
