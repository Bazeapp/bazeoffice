import { z } from "zod"

import {
  COMMENT_TYPES,
  ENTITY_TYPES,
  PHASE_LABELS,
  SOURCE_INTERFACES,
} from "./consts"
import type { EntityType } from "../types/entity"

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
