export type NotificaType = "menzione" | "risposta_thread"

export type NotificaStatus = "non_letta" | "letta" | "risolta"

export type NotificaTab = "da_risolvere" | "tutte" | "risolte"

export type NotificaActor = {
  id: string
  name: string
}

export type Notifica = {
  id: string
  userId: string
  actor: NotificaActor
  type: NotificaType
  commentId: string
  entityType: string
  entityId: string
  body: string
  status: NotificaStatus
  readAt: string | null
  resolvedAt: string | null
  createdAt: string
}

export type NotificaCounts = {
  unread: number
  daRisolvere: number
}

export type NotificaListResult = {
  items: Notifica[]
  nextCursor: string | null
}

export type CommentNavigation = {
  commentId: string
  threadRootId: string
  entityType: string
  entityId: string
  ricercaId: string | null
  rapportoId: string | null
  lavoratoreId: string | null
  famigliaId: string | null
}
