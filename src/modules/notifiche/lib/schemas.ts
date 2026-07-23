import { z } from "zod"

import { ENTITY_TYPES } from "@/modules/commenti/lib"

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const uuidLikeString = z.string().regex(UUID_LIKE, "Invalid UUID")

export const NOTIFICA_TYPES = ["menzione", "risposta_thread"] as const
export const NOTIFICA_TABS = ["da_risolvere", "tutte", "risolte"] as const

export const notificaRowSchema = z.object({
  id: uuidLikeString,
  user_id: uuidLikeString,
  actor_id: uuidLikeString,
  actor_nome: z.string().nullable().optional(),
  actor_cognome: z.string().nullable().optional(),
  type: z.enum(NOTIFICA_TYPES),
  comment_id: uuidLikeString,
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: uuidLikeString,
  body: z.string(),
  read_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  created_at: z.string(),
})

export type NotificaRow = z.infer<typeof notificaRowSchema>

export const notificaCountsSchema = z.object({
  unread: z.number().int().nonnegative(),
  da_risolvere: z.number().int().nonnegative(),
})

export const notificaListSchema = z.object({
  items: z.array(notificaRowSchema),
  next_cursor: z.string().nullable().optional(),
})

export const commentNavigationSchema = z.object({
  comment_id: uuidLikeString,
  thread_root_id: uuidLikeString,
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: uuidLikeString,
  ricerca_id: uuidLikeString.nullable().optional(),
  rapporto_id: uuidLikeString.nullable().optional(),
  lavoratore_id: uuidLikeString.nullable().optional(),
  famiglia_id: uuidLikeString.nullable().optional(),
})
