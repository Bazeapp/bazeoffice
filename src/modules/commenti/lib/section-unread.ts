import type { Comment } from "../types/comment"

export function sectionHasUnreadComments(comments: Comment[]): boolean {
  return comments.some(
    (comment) => comment.isUnread || comment.replies.some((reply) => reply.isUnread),
  )
}
