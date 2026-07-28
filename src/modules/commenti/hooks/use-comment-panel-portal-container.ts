import * as React from "react"

export const CommentPanelPortalContainerContext =
  React.createContext<HTMLElement | null>(null)

/** Portal target: the comments `DismissableLayerBranch` root element. */
export function useCommentPanelPortalContainer(): HTMLElement | null {
  return React.use(CommentPanelPortalContainerContext)
}
