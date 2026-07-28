import * as React from "react"

import type { CommentContextValue } from "./use-comment-context"

export type CommentRouteRegistration = Omit<
  CommentContextValue,
  "currentUserId" | "currentUserName"
>

export type CommentAppContextValue = {
  register: (ownerId: symbol, registration: CommentRouteRegistration | null) => void
}

export const CommentAppContext = React.createContext<CommentAppContextValue | null>(null)

export function useCommentAppRegistration(): CommentAppContextValue {
  const context = React.use(CommentAppContext)
  if (!context) {
    throw new Error("useCommentAppRegistration must be used within CommentAppProvider")
  }
  return context
}
