import { z } from "zod"

import {
  COMMENT_TYPES,
  ENTITY_TYPES,
  PHASE_LABELS,
  SOURCE_INTERFACES,
  type Comment,
  type CommentAuthor,
  type EntityRef,
  type EntityType,
} from "./commenti.types"
import { normalizeRoleTokens, resolveRolePill } from "./lib/role-pill"

export type CommentRow = {
  id: string
  entity_type: EntityType
  entity_id: string
  thread_root_id: string | null
  author_id: string
  author_nome?: string | null
  author_cognome?: string | null
  author_ruolo?: string[] | null
  author_attivo?: boolean | null
  body: string
  comment_type: (typeof COMMENT_TYPES)[number]
  phase_label?: (typeof PHASE_LABELS)[number] | null
  source_interface?: (typeof SOURCE_INTERFACES)[number] | null
  created_at: string
  edited_at?: string | null
  reply_count?: number
  is_unread?: boolean
  replies?: CommentRow[]
}

const commentRowSchema: z.ZodType<CommentRow> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    entity_type: z.enum(ENTITY_TYPES),
    entity_id: z.string().uuid(),
    thread_root_id: z.string().uuid().nullable(),
    author_id: z.string().uuid(),
    author_nome: z.string().nullable().optional(),
    author_cognome: z.string().nullable().optional(),
    author_ruolo: z.array(z.string()).nullable().optional(),
    author_attivo: z.boolean().nullable().optional(),
    body: z.string(),
    comment_type: z.enum(COMMENT_TYPES),
    phase_label: z.enum(PHASE_LABELS).nullable().optional(),
    source_interface: z.enum(SOURCE_INTERFACES).nullable().optional(),
    created_at: z.string(),
    edited_at: z.string().nullable().optional(),
    reply_count: z.number().int().nonnegative().optional(),
    is_unread: z.boolean().optional(),
    replies: z.array(commentRowSchema).optional(),
  }),
)

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
