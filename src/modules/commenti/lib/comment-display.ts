import { ENTITY_SECTION_META } from "./consts"
import type { Comment, PhaseLabel, SourceInterface } from "../types/comment"
import type { CommentSection, CommentSectionKind } from "../types/section"
import type { EntityRef, EntityType } from "../types/entity"

const SOURCE_INTERFACE_LABELS: Record<SourceInterface, string> = {
  kanban_famiglie: "Kanban famiglie",
  assegnazione_famiglie: "Assegnazione",
  dettaglio_ricerca: "Dettaglio ricerca",
  pipeline_ricerca: "Pipeline ricerca",
  dettaglio_lavoratore_ricerca: "Scheda lavoratore",
  cerca_lavoratore: "Cerca lavoratore",
  gate_1: "Gate 1",
  gate_2: "Gate 2",
  rapporti_lavorativi: "Rapporti",
  assunzioni: "Assunzioni",
  chiusure: "Chiusure",
  variazioni: "Variazioni",
  cedolini: "Cedolini",
  contributi_inps: "Contributi INPS",
  ticket_customer: "Ticket customer",
  ticket_payroll: "Ticket payroll",
  centro_notifiche: "Centro notifiche",
}

const PHASE_LABEL_TEXT: Record<PhaseLabel, string> = {
  gate_1: "Gate 1",
  gate_2: "Gate 2",
}

export function formatCommentTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getSourceInterfaceLabel(source: SourceInterface): string {
  return SOURCE_INTERFACE_LABELS[source]
}

export function getPhaseLabelText(phaseLabel: PhaseLabel): string {
  return PHASE_LABEL_TEXT[phaseLabel]
}

export function sortSectionComments(
  comments: Comment[],
  sectionEntityType: EntityType | null,
): Comment[] {
  if (sectionEntityType !== "lavoratore") {
    return comments
  }

  return [...comments].sort((left, right) => {
    const leftPinned = left.commentType === "phase_note" ? 0 : 1
    const rightPinned = right.commentType === "phase_note" ? 0 : 1
    if (leftPinned !== rightPinned) return leftPinned - rightPinned
    return left.createdAt.localeCompare(right.createdAt)
  })
}

export function getTargetDisplayName(
  target: EntityRef,
  sections: CommentSection[],
): string {
  const section = sections.find(
    (item) =>
      item.entityRef?.entityType === target.entityType &&
      item.entityRef.entityId === target.entityId,
  )
  return section?.displayName ?? ENTITY_SECTION_META[target.entityType].typeLabel
}

export function getComposerPlaceholder(
  target: EntityRef,
  sections: CommentSection[],
): string {
  const name = getTargetDisplayName(target, sections)
  return `Scrivi un commento su ${name}…`
}

export function getEmptySectionCopy(kind: CommentSectionKind): string {
  if (kind === "descendants") {
    return "Nessun commento dalle entità collegate."
  }
  if (kind === "focus") {
    return "Nessun commento su questa entità. Scrivi il primo messaggio qui sotto."
  }
  return "Nessun commento in questa sezione."
}
