import * as React from "react"

import { resolveCommentStack } from "../lib/resolve-comment-stack"
import { useCommentContext } from "../hooks/use-comment-context"
import { useCommentPanel } from "../hooks/use-comment-panel"
import { CommentPanel } from "./comment-panel"

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

  const focusSectionRef = React.useMemo(() => {
    if (!stack) return null
    return stack.sections.find((section) => section.kind === "focus")?.entityRef ?? pageFocus
  }, [pageFocus, stack])

  const activeSectionRef = expanded ? focusSectionRef : null
  const targetEntityRef = focusSectionRef ?? pageFocus

  const panelState = useCommentPanel({
    pageFocus,
    expanded: Boolean(pageFocus && expanded),
    activeSectionRef,
    targetEntityRef,
    currentUserId: context?.currentUserId ?? null,
    currentUserName: context?.currentUserName,
    sourceInterface: context?.sourceInterface ?? null,
    defaultCommentType: context?.defaultCommentType,
    phaseLabel: context?.phaseLabel ?? null,
  })

  if (!pageFocus) {
    return null
  }

  return (
    <CommentPanel
      count={panelState.count}
      countLoading={panelState.countLoading}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onClose={() => setExpanded(false)}
      anchorRef={context?.anchorRef}
    >
      {expanded ? (
        <p className="text-sm text-muted-foreground" data-testid="comments-panel-placeholder">
          Le sezioni del pannello saranno disponibili nel prossimo passo.
        </p>
      ) : null}
    </CommentPanel>
  )
}
