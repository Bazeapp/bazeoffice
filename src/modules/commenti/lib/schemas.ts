import { z } from "zod"

import {
  COMMENT_TYPES,
  ENTITY_TYPES,
  PHASE_LABELS,
  SOURCE_INTERFACES,
} from "./consts"
import type { EntityType } from "../types/entity"

/** Accepts seed/E2E ids that are uuid-shaped but not RFC 4122 (e.g. ...000a11). */
const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const uuidLikeString = z.string().regex(UUID_LIKE, "Invalid UUID")

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

export const commentRowSchema: z.ZodType<CommentRow> = z.lazy(() =>
  z.object({
    id: uuidLikeString,
    entity_type: z.enum(ENTITY_TYPES),
    entity_id: uuidLikeString,
    thread_root_id: uuidLikeString.nullable(),
    author_id: uuidLikeString,
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
