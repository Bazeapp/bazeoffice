import type {
  Notifica,
  NotificaCounts,
  NotificaListResult,
  NotificaStatus,
  CommentNavigation,
} from "../types"
import {
  commentNavigationSchema,
  notificaCountsSchema,
  notificaListSchema,
  notificaRowSchema,
  type NotificaRow,
} from "./schemas"

function deriveStatus(row: NotificaRow): NotificaStatus {
  if (row.resolved_at) return "risolta"
  if (row.read_at) return "letta"
  return "non_letta"
}

function actorName(row: NotificaRow): string {
  const firstName = row.actor_nome?.trim() ?? ""
  const lastName = row.actor_cognome?.trim() ?? ""
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Operatore"
}

export function adaptNotificaRow(row: unknown): Notifica {
  const parsed = notificaRowSchema.parse(row)
  return {
    id: parsed.id,
    userId: parsed.user_id,
    actor: {
      id: parsed.actor_id,
      name: actorName(parsed),
    },
    type: parsed.type,
    commentId: parsed.comment_id,
    entityType: parsed.entity_type,
    entityId: parsed.entity_id,
    body: parsed.body,
    status: deriveStatus(parsed),
    readAt: parsed.read_at ?? null,
    resolvedAt: parsed.resolved_at ?? null,
    createdAt: parsed.created_at,
  }
}

export function adaptNotificaRows(rows: unknown[]): Notifica[] {
  return rows.map(adaptNotificaRow)
}

export function adaptNotificaCounts(data: unknown): NotificaCounts {
  const parsed = notificaCountsSchema.parse(data)
  return {
    unread: parsed.unread,
    daRisolvere: parsed.da_risolvere,
  }
}

export function adaptNotificaList(data: unknown): NotificaListResult {
  const parsed = notificaListSchema.parse(data)
  return {
    items: adaptNotificaRows(parsed.items),
    nextCursor: parsed.next_cursor ?? null,
  }
}

export function adaptCommentNavigation(data: unknown): CommentNavigation | null {
  if (data == null) return null
  const parsed = commentNavigationSchema.parse(data)
  return {
    commentId: parsed.comment_id,
    threadRootId: parsed.thread_root_id,
    entityType: parsed.entity_type,
    entityId: parsed.entity_id,
    ricercaId: parsed.ricerca_id ?? null,
    rapportoId: parsed.rapporto_id ?? null,
    lavoratoreId: parsed.lavoratore_id ?? null,
    famigliaId: parsed.famiglia_id ?? null,
  }
}
