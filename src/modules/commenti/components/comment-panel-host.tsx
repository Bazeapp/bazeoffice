import * as React from "react"

import { resolveAssunzioniBoardCommentStack } from "../lib/comment-route-helpers"
import { resolveCommentStack } from "../lib/resolve-comment-stack"
import { collectStackWatchedEntityRefs } from "../lib/stack-anchor-exclusions"
import { useCommentContext } from "../hooks"
import { useCommentPanel } from "../hooks/use-comment-panel"
import { useSectionCommentCounts } from "../hooks/use-section-comment-counts"
import { useSectionUnreadFlags } from "../hooks/use-section-unread-flags"
import { fetchCommentNavigation } from "@/modules/notifiche/queries"
import {
  readCommentIdFromSearch,
  subscribeCommentDeepLink,
} from "@/modules/notifiche/lib/entity-route-map"
import type { EntityRef, EntityType } from "../types/entity"
import { CommentPanel } from "./comment-panel"
import { CommentPanelBody } from "./comment-panel-body"

export function CommentPanelHost() {
  const context = useCommentContext()
  const [expanded, setExpanded] = React.useState(false)
  const [highlightCommentId, setHighlightCommentId] = React.useState<string | null>(
    null,
  )
  const [deepLinkAnchor, setDeepLinkAnchor] = React.useState<EntityRef | null>(null)
  const [openedFromCentroNotifiche, setOpenedFromCentroNotifiche] =
    React.useState(false)
  const pageFocus = context?.pageFocus ?? null
  const focusKey = pageFocus
    ? `${pageFocus.entityType}:${pageFocus.entityId}`
    : null
  const consumedDeepLinkRef = React.useRef<string | null>(null)
  const highlightClearTimerRef = React.useRef<number | null>(null)

  const clearHighlightTimer = React.useCallback(() => {
    if (highlightClearTimerRef.current != null) {
      window.clearTimeout(highlightClearTimerRef.current)
      highlightClearTimerRef.current = null
    }
  }, [])

  const consumeCommentDeepLink = React.useCallback(
    (commentIdFromEvent: string | null = null) => {
      if (!pageFocus) return
      const commentId = commentIdFromEvent ?? readCommentIdFromSearch()
      if (!commentId) return
      const consumeKey = `${focusKey}:${commentId}`
      if (consumedDeepLinkRef.current === consumeKey) return
      consumedDeepLinkRef.current = consumeKey

      setExpanded(true)
      setHighlightCommentId(commentId)
      setOpenedFromCentroNotifiche(true)

      void fetchCommentNavigation(commentId)
        .then((navigation) => {
          if (!navigation) return
          setDeepLinkAnchor({
            entityType: navigation.entityType as EntityType,
            entityId: navigation.entityId,
          })
        })
        .catch(() => {
          setDeepLinkAnchor(null)
        })

      clearHighlightTimer()
      highlightClearTimerRef.current = window.setTimeout(() => {
        setHighlightCommentId((current) => (current === commentId ? null : current))
        const url = new URL(window.location.href)
        if (url.searchParams.get("comment") === commentId) {
          url.searchParams.delete("comment")
          window.history.replaceState({}, "", `${url.pathname}${url.search}`)
        }
        highlightClearTimerRef.current = null
      }, 2000)
    },
    [clearHighlightTimer, focusKey, pageFocus],
  )

  React.useEffect(() => {
    setExpanded(false)
    setHighlightCommentId(null)
    setDeepLinkAnchor(null)
    setOpenedFromCentroNotifiche(false)
    consumedDeepLinkRef.current = null
    clearHighlightTimer()
  }, [clearHighlightTimer, focusKey])

  React.useEffect(() => {
    consumeCommentDeepLink()
    return subscribeCommentDeepLink((commentId) => {
      consumeCommentDeepLink(commentId)
    })
  }, [consumeCommentDeepLink])

  React.useEffect(() => () => clearHighlightTimer(), [clearHighlightTimer])

  const sourceInterface = context?.sourceInterface ?? null
  const row = context?.row
  const displayNames = context?.displayNames

  const stack = React.useMemo(() => {
    if (!pageFocus) return null
    if (sourceInterface === "assunzioni") {
      return resolveAssunzioniBoardCommentStack({
        pageFocus,
        row: row ?? {},
        displayNames,
      })
    }
    return resolveCommentStack({
      focus: pageFocus,
      row: row ?? {},
      displayNames,
    })
  }, [displayNames, pageFocus, row, sourceInterface])

  const watchedEntityRefs = React.useMemo(() => {
    if (!pageFocus || !stack) return []
    return collectStackWatchedEntityRefs(pageFocus, stack)
  }, [pageFocus, stack])

  const countState = useCommentPanel({
    pageFocus,
    watchedEntityRefs,
    expanded: false,
    activeSectionKind: null,
    activeSectionRef: null,
    excludeAnchors: [],
    targetEntityRef: pageFocus,
    currentUserId: context?.currentUserId ?? null,
    currentUserName: context?.currentUserName,
    sourceInterface: context?.sourceInterface ?? null,
    defaultCommentType: context?.defaultCommentType,
    phaseLabel: context?.phaseLabel ?? null,
  })

  const { counts: sectionCounts, loading: sectionCountsLoading } =
    useSectionCommentCounts(pageFocus ?? { entityType: "ricerca", entityId: "" }, stack ?? {
      sections: [],
      chipOptions: [],
      visibilityHintsByTarget: {},
    })

  const currentUserId = context?.currentUserId ?? null
  const { mentionFlags: sectionUnreadMentionFlags } = useSectionUnreadFlags(
    pageFocus ?? { entityType: "ricerca", entityId: "" },
    stack ?? { sections: [], chipOptions: [], visibilityHintsByTarget: {} },
    sectionCounts,
    sectionCountsLoading,
    currentUserId,
  )

  const hasUnreadMention = React.useMemo(
    () => Object.values(sectionUnreadMentionFlags).some(Boolean),
    [sectionUnreadMentionFlags],
  )

  if (!pageFocus || !stack) {
    return null
  }

  const panelOptions = {
    currentUserId: context?.currentUserId ?? null,
    currentUserName: context?.currentUserName,
    sourceInterface: openedFromCentroNotifiche
      ? ("centro_notifiche" as const)
      : (context?.sourceInterface ?? null),
    defaultCommentType: context?.defaultCommentType,
    phaseLabel: context?.phaseLabel ?? null,
  }

  const handleClose = () => {
    setExpanded(false)
    setOpenedFromCentroNotifiche(false)
    setDeepLinkAnchor(null)
  }

  return (
    <CommentPanel
      count={countState.count}
      countLoading={countState.countLoading}
      hasUnreadMention={hasUnreadMention}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onClose={handleClose}
    >
      {expanded ? (
        <CommentPanelBody
          pageFocus={pageFocus}
          stack={stack}
          totalCount={countState.count}
          panelOptions={panelOptions}
          highlightCommentId={highlightCommentId}
          deepLinkAnchor={deepLinkAnchor}
        />
      ) : null}
    </CommentPanel>
  )
}
