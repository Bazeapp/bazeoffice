import * as React from "react"

import type { CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { EntityRef } from "../types/entity"

export type CommentContextValue = {
  pageFocus: EntityRef | null
  row: Record<string, unknown>
  sourceInterface: SourceInterface | null
  displayNames?: Record<string, string>
  currentUserId: string | null
  currentUserName?: string
  defaultCommentType?: CommentType
  phaseLabel?: PhaseLabel | null
  anchorRef: React.RefObject<HTMLElement | null>
}

const CommentContext = React.createContext<CommentContextValue | null>(null)

export function CommentContextProvider({
  value,
  children,
}: {
  value: CommentContextValue
  children: React.ReactNode
}) {
  return <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
}

export function useCommentContext(): CommentContextValue | null {
  return React.use(CommentContext)
}

export function useRequiredCommentContext(): CommentContextValue {
  const context = useCommentContext()
  if (!context) {
    throw new Error("useRequiredCommentContext must be used within CommentContextProvider")
  }
  return context
}
