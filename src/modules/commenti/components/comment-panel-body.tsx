import * as React from "react"

import { entityRefKey } from "../lib/entity-ref"
import {
  createInitialSelection,
  resolveActiveSectionRef,
  selectSection,
  selectTarget,
} from "../lib/comment-panel-selection"
import { getComposerPlaceholder } from "../lib/comment-display"
import type { UseCommentPanelOptions } from "../hooks/use-comment-panel"
import { useCommentPanel } from "../hooks/use-comment-panel"
import type { ResolveCommentStackResult } from "../types/section"
import type { EntityRef } from "../types/entity"
import { CommentComposer } from "./comment-composer"
import { CommentSectionPanel, CommentSectionsAccordion } from "./comment-section"
import { CommentTargetChip } from "./comment-target-chip"

type CommentPanelBodyProps = {
  pageFocus: EntityRef
  stack: ResolveCommentStackResult
  panelOptions: Omit<
    UseCommentPanelOptions,
    "pageFocus" | "expanded" | "activeSectionRef" | "targetEntityRef"
  >
}

export function CommentPanelBody({
  pageFocus,
  stack,
  panelOptions,
}: CommentPanelBodyProps) {
  const composerRef = React.useRef<HTMLTextAreaElement>(null)
  const listEndRef = React.useRef<HTMLDivElement>(null)
  const [selection, setSelection] = React.useState(() =>
    createInitialSelection(stack, pageFocus),
  )
  const [composerFocused, setComposerFocused] = React.useState(false)
  const [replyTo, setReplyTo] = React.useState<{ rootId: string; label: string } | null>(
    null,
  )

  React.useEffect(() => {
    setSelection(createInitialSelection(stack, pageFocus))
    setReplyTo(null)
  }, [pageFocus.entityId, pageFocus.entityType, stack])

  const activeSectionRef = resolveActiveSectionRef(stack, selection.activeSectionId)

  const panelState = useCommentPanel({
    ...panelOptions,
    pageFocus,
    expanded: true,
    activeSectionRef,
    targetEntityRef: selection.targetEntityRef,
  })

  React.useEffect(() => {
    if (!panelState.sectionLoading && activeSectionRef) {
      listEndRef.current?.scrollIntoView({ block: "end" })
    }
  }, [
    activeSectionRef,
    panelState.sectionComments.length,
    panelState.sectionLoading,
    selection.activeSectionId,
  ])

  const visibilityHint =
    stack.visibilityHintsByTarget[entityRefKey(selection.targetEntityRef)] ?? null

  const involvedOperatorIds = React.useMemo(() => {
    const ids = new Set<string>()
    if (panelOptions.currentUserId) {
      ids.add(panelOptions.currentUserId)
    }
    for (const comment of panelState.sectionComments) {
      ids.add(comment.author.id)
      for (const reply of comment.replies) {
        ids.add(reply.author.id)
      }
    }
    return [...ids]
  }, [panelOptions.currentUserId, panelState.sectionComments])

  const handleSectionChange = (sectionId: string) => {
    setSelection((current) =>
      selectSection(stack, sectionId, current.targetEntityRef),
    )
    setReplyTo(null)
  }

  const handleTargetChange = (target: EntityRef) => {
    setSelection((current) => selectTarget(stack, target, current.activeSectionId))
    setReplyTo(null)
  }

  const handleCommenta = (section: (typeof stack.sections)[number]) => {
    if (section.entityRef) {
      setSelection({
        activeSectionId: section.id,
        targetEntityRef: section.entityRef,
      })
    } else {
      setSelection((current) => ({ ...current, activeSectionId: section.id }))
    }
    setReplyTo(null)
    window.requestAnimationFrame(() => composerRef.current?.focus())
  }

  const handleSubmit = async (body: string) => {
    if (replyTo) {
      await panelState.submitReply(replyTo.rootId, body)
      setReplyTo(null)
      return
    }
    await panelState.submitComment(body)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <CommentSectionsAccordion
        sections={stack.sections}
        activeSectionId={selection.activeSectionId}
        onSectionChange={handleSectionChange}
        onCommenta={handleCommenta}
        renderSectionContent={(section) => {
          if (section.id !== selection.activeSectionId) return null
          if (section.kind === "descendants") {
            return (
              <p className="text-sm text-muted-foreground" data-testid="comments-empty-state">
                I commenti dalle entità collegate saranno mostrati qui.
              </p>
            )
          }
          return (
            <CommentSectionPanel
              section={section}
              comments={panelState.sectionComments}
              loading={panelState.sectionLoading}
              hasMore={panelState.hasMoreSectionComments}
              isLoadingMore={panelState.isLoadingMore}
              showOriginBadges={false}
              currentUserId={panelOptions.currentUserId}
              onLoadMore={() => void panelState.loadMoreSectionComments()}
              onReply={(rootId, authorName) =>
                setReplyTo({ rootId, label: authorName })
              }
              onEdit={(commentId, body) =>
                void panelState.editComment({ commentId, body })
              }
              onMarkRead={panelState.markReadIfNeeded}
              listEndRef={listEndRef}
            />
          )
        }}
      />

      <div className="mt-auto space-y-2 border-t border-border pt-3">
        <CommentTargetChip
          target={selection.targetEntityRef}
          options={stack.chipOptions}
          sections={stack.sections}
          visibilityHint={visibilityHint}
          composerFocused={composerFocused}
          onTargetChange={handleTargetChange}
        />
        <CommentComposer
          inputRef={composerRef}
          placeholder={getComposerPlaceholder(selection.targetEntityRef, stack.sections)}
          disabled={!panelOptions.currentUserId}
          isSubmitting={panelState.isSubmitting}
          replyToLabel={replyTo?.label ?? null}
          involvedOperatorIds={involvedOperatorIds}
          onCancelReply={() => setReplyTo(null)}
          onFocusChange={setComposerFocused}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
