import type { Comment } from "../types/comment"

/** Roots plus inline replies — matches pill/section count semantics when no total_count. */
export function countThreadComments(comments: Comment[]): number {
  return comments.reduce((sum, root) => sum + 1 + root.replies.length, 0)
}
