import * as React from "react"

import { resolveCommentStack } from "../lib/resolve-comment-stack"
import { useCommentContext } from "../hooks"
import { useCommentPanel } from "../hooks/use-comment-panel"
import { CommentPanel } from "./comment-panel"
import { CommentPanelBody } from "./comment-panel-body"

export function CommentPanelHost() {
  const context = useCommentContext()
  const [expanded, setExpanded] = React.useState(false)
  const pageFocus = context?.pageFocus ?? null

  const stack = React.useMemo(() => {
    if (!context?.pageFocus) return null
    return resolveCommentStack({
      focus: context.pageFocus,
      row: context.row,
      displayNames: context.displayNames,
    })
  }, [context])

  const countState = useCommentPanel({
    pageFocus,
    expanded: false,
    activeSectionRef: null,
    targetEntityRef: pageFocus,
    currentUserId: context?.currentUserId ?? null,
    currentUserName: context?.currentUserName,
    sourceInterface: context?.sourceInterface ?? null,
    defaultCommentType: context?.defaultCommentType,
    phaseLabel: context?.phaseLabel ?? null,
  })

  if (!pageFocus || !stack) {
    return null
  }

  const panelOptions = {
    currentUserId: context?.currentUserId ?? null,
    currentUserName: context?.currentUserName,
    sourceInterface: context?.sourceInterface ?? null,
    defaultCommentType: context?.defaultCommentType,
    phaseLabel: context?.phaseLabel ?? null,
  }

  return (
    <CommentPanel
      count={countState.count}
      countLoading={countState.countLoading}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onClose={() => setExpanded(false)}
    >
      {expanded ? (
        <CommentPanelBody
          pageFocus={pageFocus}
          stack={stack}
          totalCount={countState.count}
          panelOptions={panelOptions}
        />
      ) : null}
    </CommentPanel>
  )
}
