import type { Comment } from "../types/comment"
import { parseMentionMarkup } from "./mention-markup"

export function commentMentionsUser(
  comment: Comment,
  userId: string | null,
): boolean {
  if (!userId) return false
  return parseMentionMarkup(comment.body).some(
    (part) => part.type === "mention" && part.userId === userId,
  )
}

export function commentIsUnreadMention(
  comment: Comment,
  userId: string | null,
): boolean {
  return comment.isUnread && commentMentionsUser(comment, userId)
}

export function sectionHasUnreadComments(comments: Comment[]): boolean {
  return comments.some(
    (comment) => comment.isUnread || comment.replies.some((reply) => reply.isUnread),
  )
}

export function sectionHasUnreadMentions(
  comments: Comment[],
  userId: string | null,
): boolean {
  return comments.some(
    (comment) =>
      commentIsUnreadMention(comment, userId) ||
      comment.replies.some((reply) => commentIsUnreadMention(reply, userId)),
  )
}
