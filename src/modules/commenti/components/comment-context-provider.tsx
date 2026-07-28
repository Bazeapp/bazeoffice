import * as React from "react"

import { CommentContext, type CommentContextValue } from "../hooks/use-comment-context"

export type { CommentContextValue } from "../hooks/use-comment-context"

export function CommentContextProvider({
  value,
  children,
}: {
  value: CommentContextValue
  children: React.ReactNode
}) {
  return <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
}
