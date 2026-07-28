import type { Comment } from "./comment"

export type CommentListSectionRpcResponse = {
  comments: Comment[]
  nextCursor: string | null
}
