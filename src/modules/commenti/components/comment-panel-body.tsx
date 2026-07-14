import * as React from "react"
import { MessageSquareIcon } from "lucide-react"

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
  totalCount: number
  panelOptions: Omit<
    UseCommentPanelOptions,
    "pageFocus" | "expanded" | "activeSectionRef" | "targetEntityRef"
  >
}

function EmptyConversationHero() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3.5 px-8 py-14 text-center"
      data-testid="comments-empty-hero"
    >
      <div className="flex size-13 items-center justify-center rounded-full bg-[#eef0f3]">
        <MessageSquareIcon className="size-6 text-[#b6bcc6]" strokeWidth={1.8} />
      </div>
      <p className="text-[15px] font-semibold text-[#4b5563]">
        Avvia una conversazione
      </p>
      <p className="text-[13px] text-[#9ca3af]">
        Usa <span className="font-semibold text-[#2563EB]">@</span> per menzionare
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

  const showEmptyHero = totalCount === 0 && !panelState.sectionLoading

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-y-auto bg-[#F8F9FA]"
        data-testid="comments-panel-body"
      >
        {showEmptyHero ? <EmptyConversationHero /> : null}
        <CommentSectionsAccordion
          sections={stack.sections}
          activeSectionId={selection.activeSectionId}
          onSectionChange={handleSectionChange}
          onCommenta={handleCommenta}
          renderSectionContent={(section) => {
            if (section.id !== selection.activeSectionId) return null
            if (section.kind === "descendants") {
              return (
                <p
                  className="px-4 pb-4 pl-10 text-[12.5px] text-[#b6bcc6]"
                  data-testid="comments-empty-state"
                >
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
      </div>

      <div className="relative shrink-0 border-t border-[#eef0f3] bg-white px-4 pt-3 pb-3.5">
        <CommentTargetChip
          target={selection.targetEntityRef}
          options={stack.chipOptions}
          sections={stack.sections}
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
        {composerFocused && visibilityHint ? (
          <p
            className="mt-2 text-[11px] text-[#9ca3af]"
            data-testid="comments-visibility-hint"
          >
            ↗ Visibile anche su{" "}
            <span className="font-medium text-[#6b7280]">{visibilityHint}</span>
          </p>
        ) : null}
      </div>
    </>
  )
}
