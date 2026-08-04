import { adaptCommentRows } from "./adapters"
import type { CommentListSectionRpcResponse } from "../types/comment-rpc"

export function readCommentCount(data: unknown): number {
  if (typeof data === "number" && Number.isFinite(data)) return data
  if (data && typeof data === "object" && "count" in data) {
    const count = (data as { count: unknown }).count
    if (typeof count === "number" && Number.isFinite(count)) return count
  }
  return 0
}

export function readCommentListSectionRpcResponse(
  data: unknown,
): CommentListSectionRpcResponse {
  if (!data || typeof data !== "object") {
    return { comments: [], nextCursor: null }
  }

  const payload = data as {
    comments?: unknown
    rows?: unknown
    next_cursor?: unknown
    nextCursor?: unknown
  }

  const rows = Array.isArray(payload.comments)
    ? payload.comments
    : Array.isArray(payload.rows)
      ? payload.rows
      : []

  const nextCursorRaw = payload.next_cursor ?? payload.nextCursor
  const nextCursor = typeof nextCursorRaw === "string" ? nextCursorRaw : null

  return {
    comments: adaptCommentRows(rows),
    nextCursor,
  }
}
