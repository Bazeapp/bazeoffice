import type { Comment, CommentAuthor } from "../types/comment"
import type { EntityRef } from "../types/entity"
import { normalizeRoleTokens, resolveRolePill } from "./role-pill"
import { commentRowSchema, type CommentRow } from "./schemas"

function toAuthor(row: CommentRow): CommentAuthor {
  const firstName = row.author_nome?.trim() ?? ""
  const lastName = row.author_cognome?.trim() ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
  const tokens = normalizeRoleTokens(row.author_ruolo)
  const isDeactivated = row.author_attivo === false

  return {
    id: row.author_id,
    name: isDeactivated && fullName ? `${fullName} (disattivato)` : fullName || "Operatore",
    rolePill: resolveRolePill(tokens),
    isDeactivated,
  }
}

function toEntityRef(entityType: CommentRow["entity_type"], entityId: string): EntityRef {
  return { entityType, entityId }
}

export function adaptCommentRow(row: unknown): Comment {
  const parsed = commentRowSchema.parse(row)

  return {
    id: parsed.id,
    threadRootId: parsed.thread_root_id,
    anchor: toEntityRef(parsed.entity_type, parsed.entity_id),
    author: toAuthor(parsed),
    body: parsed.body,
    commentType: parsed.comment_type,
    phaseLabel: parsed.phase_label ?? null,
    sourceInterface: parsed.source_interface ?? null,
    createdAt: parsed.created_at,
    editedAt: parsed.edited_at ?? null,
    isUnread: parsed.is_unread ?? false,
    replyCount: parsed.reply_count ?? parsed.replies?.length ?? 0,
    replies: (parsed.replies ?? []).map(adaptCommentRow),
  }
}

export function adaptCommentRows(rows: unknown[]): Comment[] {
  return rows.map(adaptCommentRow)
}
