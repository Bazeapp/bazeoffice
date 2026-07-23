import type { Comment, CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { EntityRef } from "../types/entity"

export function shouldMarkCommentRead(
  comment: Comment,
  currentUserId: string | null,
): boolean {
  if (!currentUserId) return false
  if (comment.author.id === currentUserId) return false
  if (!comment.isUnread) return false
  return true
}

export function scopeRowMatchesPageFocus(
  row: Record<string, unknown> | null,
  pageFocus: EntityRef,
): boolean {
  if (!row) return false
  const entityType = row.entity_type ?? row.page_entity_type
  const entityId = row.entity_id ?? row.page_entity_id
  return entityType === pageFocus.entityType && entityId === pageFocus.entityId
}

export function scopeRowMatchesEntityRefs(
  row: Record<string, unknown> | null,
  entityRefs: EntityRef[],
): boolean {
  if (!row || entityRefs.length === 0) return false
  const entityType = row.entity_type ?? row.page_entity_type
  const entityId = row.entity_id ?? row.page_entity_id
  return entityRefs.some(
    (ref) => ref.entityType === entityType && ref.entityId === entityId,
  )
}

export function makeOptimisticComment(input: {
  id: string
  anchor: EntityRef
  authorId: string
  authorName: string
  body: string
  commentType: CommentType
  phaseLabel: PhaseLabel | null
  sourceInterface: SourceInterface | null
  threadRootId?: string | null
}): Comment {
  const now = new Date().toISOString()
  return {
    id: input.id,
    threadRootId: input.threadRootId ?? null,
    anchor: input.anchor,
    author: {
      id: input.authorId,
      name: input.authorName,
      rolePill: "Operatore",
      isDeactivated: false,
    },
    body: input.body,
    commentType: input.commentType,
    phaseLabel: input.phaseLabel,
    sourceInterface: input.sourceInterface,
    createdAt: now,
    editedAt: null,
    isUnread: false,
    replyCount: 0,
    replies: [],
    isOptimistic: true,
  }
}

export function appendReplyToRoot(
  comments: Comment[],
  rootId: string,
  reply: Comment,
): Comment[] {
  return comments.map((comment) => {
    if (comment.id !== rootId) return comment
    return {
      ...comment,
      replyCount: comment.replyCount + 1,
      replies: [...comment.replies, reply],
    }
  })
}
