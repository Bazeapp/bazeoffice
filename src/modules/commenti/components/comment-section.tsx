import * as React from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

import { getEmptySectionCopy, sortSectionComments } from "../lib/comment-display"
import type { Comment } from "../types/comment"
import type { CommentSection } from "../types/section"
import { CommentSectionIcon } from "./comment-section-icon"
import { CommentThread } from "./comment-thread"

type CommentSectionPanelProps = {
  section: CommentSection
  comments: Comment[]
  loading?: boolean
  hasMore?: boolean
  isLoadingMore?: boolean
  showOriginBadges?: boolean
  currentUserId: string | null
  onLoadMore?: () => void
  onReply: (rootId: string, authorName: string) => void
  onEdit: (commentId: string, body: string) => Promise<void> | void
  onMarkRead?: (comment: Comment) => void
  listEndRef?: React.RefObject<HTMLDivElement | null>
}

export function CommentSectionPanel({
  section,
  comments,
  loading = false,
  hasMore = false,
  isLoadingMore = false,
  showOriginBadges = false,
  currentUserId,
  onLoadMore,
  onReply,
  onEdit,
  onMarkRead,
  listEndRef,
}: CommentSectionPanelProps) {
  const sortedComments = React.useMemo(
    () => sortSectionComments(comments, section.entityRef?.entityType ?? null),
    [comments, section.entityRef?.entityType],
  )

  return (
    <div data-testid={`comments-section-${section.id}`}>
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            data-testid="comments-load-more"
            className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore ? "Caricamento…" : "Carica altri"}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="px-3.5 py-3 text-xs text-foreground-faint">Caricamento commenti…</p>
      ) : sortedComments.length === 0 ? (
        <p
          className="px-3.5 py-3 text-xs text-foreground-faint"
          data-testid="comments-empty-state"
        >
          {getEmptySectionCopy(section.kind)}
        </p>
      ) : (
        <div className="py-1">
          {sortedComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              showOriginBadge={showOriginBadges}
              onReply={(rootId) => onReply(rootId, comment.author.name)}
              onEdit={onEdit}
              onMarkRead={onMarkRead}
            />
          ))}
          <div ref={listEndRef} />
        </div>
      )}
    </div>
  )
}

function CommentSectionCountBadge({
  count,
  loading = false,
  muted = false,
}: {
  count: number
  loading?: boolean
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        "flex min-w-5.5 items-center justify-center rounded-full px-1.5 py-0.5",
        "text-2xs font-semibold tabular-nums",
        muted
          ? "bg-surface-muted text-foreground-faint"
          : "bg-surface-muted text-foreground-subtle",
      )}
      data-testid="comments-section-count"
    >
      {loading ? "…" : count}
    </span>
  )
}

type CommentSectionsAccordionProps = {
  sections: CommentSection[]
  activeSectionId: string
  sectionCounts: Record<string, number>
  sectionCountsLoading?: Record<string, boolean>
  onSectionChange: (sectionId: string) => void
  renderSectionContent: (section: CommentSection) => React.ReactNode
}

export function CommentSectionsAccordion({
  sections,
  activeSectionId,
  sectionCounts,
  sectionCountsLoading = {},
  onSectionChange,
  renderSectionContent,
}: CommentSectionsAccordionProps) {
  return (
    <div className="p-3.5">
      <Accordion
        type="single"
        collapsible
        tone="flush"
        value={activeSectionId}
        onValueChange={(value) => {
          if (value) onSectionChange(value)
        }}
        className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface shadow-none"
      >
        {sections.map((section) => {
          const isDescendants = section.kind === "descendants"
          const count = sectionCounts[section.id] ?? 0
          const countLoading = sectionCountsLoading[section.id] ?? false

          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="shadow-none data-[state=open]:shadow-none"
            >
              <AccordionTrigger
                data-testid={`comments-section-toggle-${section.id}`}
                iconVariant="bare"
                showChevron={false}
                plain
                icon={
                  <CommentSectionIcon
                    entityType={section.entityRef?.entityType ?? null}
                    kind={section.kind}
                    muted={isDescendants}
                  />
                }
                className={cn(
                  "gap-2 px-3.5 py-2.5 hover:bg-background-subtle",
                  "[&>span:last-child]:w-full [&>span:last-child]:min-w-0 [&>span:last-child]:overflow-visible",
                  isDescendants && "text-foreground-faint",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-2xs font-bold tracking-wide uppercase",
                      isDescendants ? "text-foreground-faint" : "text-foreground-muted",
                    )}
                  >
                    {section.typeLabel}
                  </span>
                  <CommentSectionCountBadge
                    count={count}
                    loading={countLoading}
                    muted={isDescendants}
                  />
                </span>
              </AccordionTrigger>
              <AccordionContent className="border-t-0! px-0 py-0">
                {renderSectionContent(section)}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
