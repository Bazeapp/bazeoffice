import * as React from "react"
import { ArrowUpRightIcon, MessageSquareIcon } from "lucide-react"

import { entityRefKey } from "../lib/entity-ref"
import {
  createInitialSelection,
  isPendingFocusSection,
  resolveActiveSectionKind,
  resolveActiveSectionRef,
  selectSection,
  selectTarget,
} from "../lib/comment-panel-selection"
import { collectStackAnchorExclusions, collectStackWatchedEntityRefs } from "../lib/stack-anchor-exclusions"
import { getComposerPlaceholder, getSectionSubtitle } from "../lib/comment-display"
import type { UseCommentPanelOptions } from "../hooks/use-comment-panel"
import { useCommentPanel } from "../hooks/use-comment-panel"
import type { ResolveCommentStackResult } from "../types/section"
import type { EntityRef } from "../types/entity"
import { CommentComposer } from "./comment-composer"
import { CommentSectionPanel, CommentSectionsAccordion } from "./comment-section"
import { CommentTargetChip } from "./comment-target-chip"
import { useSectionCommentCounts } from "../hooks/use-section-comment-counts"
import { useSectionUnreadFlags } from "../hooks/use-section-unread-flags"

type CommentPanelBodyProps = {
  pageFocus: EntityRef
  stack: ResolveCommentStackResult
  totalCount: number
  panelOptions: Omit<
    UseCommentPanelOptions,
    | "pageFocus"
    | "expanded"
    | "activeSectionKind"
    | "activeSectionRef"
    | "excludeAnchors"
    | "targetEntityRef"
    | "watchedEntityRefs"
  >
}

function EmptyConversationHero() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3.5 px-8 py-14 text-center"
      data-testid="comments-empty-hero"
    >
      <div className="flex size-13 items-center justify-center rounded-full bg-surface-muted">
        <MessageSquareIcon className="size-6 text-foreground-faint" strokeWidth={1.8} />
      </div>
      <p className="text-lg font-semibold text-foreground-subtle">
        Avvia una conversazione
      </p>
      <p className="text-sm text-foreground-faint">
        Usa <span className="font-semibold text-accent">@</span> per menzionare
        un collega
      </p>
    </div>
  )
}

export function CommentPanelBody({
  pageFocus,
  stack,
  totalCount,
  panelOptions,
}: CommentPanelBodyProps) {
  const composerRef = React.useRef<HTMLDivElement>(null)
  const listEndRef = React.useRef<HTMLDivElement>(null)
  const [selection, setSelection] = React.useState(() =>
    createInitialSelection(stack, pageFocus),
  )
  const [replyTo, setReplyTo] = React.useState<{ rootId: string; label: string } | null>(
    null,
  )

  // Host may pass a new `stack` object every render; only reset selection when
  // the page focus or section layout actually changes.
  const stackRef = React.useRef(stack)
  React.useEffect(() => {
    stackRef.current = stack
  })
  const stackSectionsKey = stack.sections.map((section) => section.id).join("|")

  React.useEffect(() => {
    setSelection(
      createInitialSelection(stackRef.current, {
        entityType: pageFocus.entityType,
        entityId: pageFocus.entityId,
      }),
    )
    setReplyTo(null)
  }, [pageFocus.entityId, pageFocus.entityType, stackSectionsKey])

  const activeSectionRef = resolveActiveSectionRef(stack, selection.activeSectionId)
  const activeSectionKind = resolveActiveSectionKind(stack, selection.activeSectionId)
  const activeSection = stack.sections.find(
    (section) => section.id === selection.activeSectionId,
  )
  const pendingFocus = isPendingFocusSection(activeSection)
  const excludeAnchors = React.useMemo(
    () => collectStackAnchorExclusions(stack),
    [stack],
  )
  const watchedEntityRefs = React.useMemo(
    () => collectStackWatchedEntityRefs(pageFocus, stack),
    [pageFocus, stack],
  )

  const panelState = useCommentPanel({
    ...panelOptions,
    pageFocus,
    watchedEntityRefs,
    expanded: true,
    activeSectionKind,
    activeSectionRef,
    excludeAnchors,
    // Pending ASSUNZIONE has no writable anchor — do not bind create to RAPPORTO.
    targetEntityRef: pendingFocus ? null : selection.targetEntityRef,
  })

  const { counts: sectionCounts, loading: sectionCountsLoading } =
    useSectionCommentCounts(pageFocus, stack)
  const { flags: sectionUnreadFlags, mentionFlags: sectionUnreadMentionFlags } =
    useSectionUnreadFlags(
      pageFocus,
      stack,
      sectionCounts,
      sectionCountsLoading,
      panelOptions.currentUserId,
    )

  React.useEffect(() => {
    // Use section id (not entity ref): descendants/COLLEGATE has no entityRef, but
    // still needs scrollIntoView so unread threads enter the panel viewport and
    // the mark-read IntersectionObserver can settle after the accordion opens.
    if (!panelState.sectionLoading && selection.activeSectionId) {
      // `nearest` avoids yanking unread threads out of view (which cancelled
      // the mark-read IntersectionObserver timer with `block: "end"`).
      listEndRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [
    panelState.sectionComments.length,
    panelState.sectionLoading,
    selection.activeSectionId,
  ])

  const visibilityHint =
    pendingFocus || !selection.targetEntityRef
      ? null
      : (stack.visibilityHintsByTarget[entityRefKey(selection.targetEntityRef)] ?? null)

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

  const handleSubmit = async (body: string) => {
    if (pendingFocus) return
    if (replyTo) {
      await panelState.submitReply(replyTo.rootId, body)
      setReplyTo(null)
      return
    }
    await panelState.submitComment(body)
  }

  const showEmptyHero = totalCount === 0 && !panelState.sectionLoading
  const pendingSubtitle = activeSection
    ? getSectionSubtitle(activeSection.displayName, activeSection.typeLabel)
    : null

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-y-auto bg-background-subtle"
        data-testid="comments-panel-body"
      >
        {showEmptyHero ? <EmptyConversationHero /> : null}
        <CommentSectionsAccordion
          sections={stack.sections}
          activeSectionId={selection.activeSectionId}
          sectionCounts={sectionCounts}
          sectionCountsLoading={sectionCountsLoading}
          sectionUnreadFlags={sectionUnreadFlags}
          sectionUnreadMentionFlags={sectionUnreadMentionFlags}
          onSectionChange={handleSectionChange}
          renderSectionContent={(section) => {
            if (section.id !== selection.activeSectionId) return null
            const isDescendants = section.kind === "descendants"
            return (
              <CommentSectionPanel
                section={section}
                comments={panelState.sectionComments}
                loading={panelState.sectionLoading}
                hasMore={panelState.hasMoreSectionComments}
                isLoadingMore={panelState.isLoadingMore}
                showOriginBadges={isDescendants}
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
      </div>

      <div className="relative shrink-0 border-t border-border-subtle bg-surface px-4 pt-3 pb-3.5">
        {pendingFocus && activeSection ? (
          <div
            className="mb-2 flex min-w-0 items-center gap-2 rounded-md border-2 border-border-subtle bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground-subtle"
            data-testid="comments-target-chip-pending"
          >
            <span aria-hidden className="text-sm leading-none">
              {activeSection.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-left">
              {activeSection.typeLabel}
              {pendingSubtitle ? ` · ${pendingSubtitle}` : null}
            </span>
          </div>
        ) : (
          <CommentTargetChip
            target={selection.targetEntityRef}
            options={stack.chipOptions}
            sections={stack.sections}
            onTargetChange={handleTargetChange}
          />
        )}
        <CommentComposer
          inputRef={composerRef}
          placeholder={
            pendingFocus
              ? "Apri RAPPORTO per commentare sul rapporto…"
              : getComposerPlaceholder(selection.targetEntityRef, stack.sections)
          }
          disabled={!panelOptions.currentUserId || pendingFocus}
          isSubmitting={panelState.isSubmitting}
          replyToLabel={replyTo?.label ?? null}
          involvedOperatorIds={involvedOperatorIds}
          onCancelReply={() => setReplyTo(null)}
          onSubmit={handleSubmit}
        />
        {visibilityHint ? (
          <p
            className="mt-2 flex items-center gap-1 text-2xs text-foreground-faint"
            data-testid="comments-visibility-hint"
          >
            <ArrowUpRightIcon aria-hidden className="size-3 shrink-0" strokeWidth={2} />
            <span className="min-w-0 line-clamp-1 whitespace-nowrap">
              Visibile anche su{" "}
              <span className="font-medium text-foreground-subtle">{visibilityHint}</span>
            </span>
          </p>
        ) : null}
      </div>
    </>
  )
}
