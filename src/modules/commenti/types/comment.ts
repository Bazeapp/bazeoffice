import type { EntityRef } from "./entity"

export type CommentType = "free" | "phase_note"
export type PhaseLabel = "gate_1" | "gate_2"
export type SourceInterface =
  | "kanban_famiglie"
  | "assegnazione_famiglie"
  | "dettaglio_ricerca"
  | "pipeline_ricerca"
  | "dettaglio_lavoratore_ricerca"
  | "cerca_lavoratore"
  | "gate_1"
  | "gate_2"
  | "rapporti_lavorativi"
  | "assunzioni"
  | "chiusure"
  | "variazioni"
  | "cedolini"
  | "contributi_inps"
  | "ticket_customer"
  | "ticket_payroll"
  | "centro_notifiche"

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
