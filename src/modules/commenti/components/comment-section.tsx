import * as React from "react"

import { cn } from "@/lib/utils"

import {
  getEmptySectionCopy,
  getSectionSubtitle,
  sortSectionComments,
} from "../lib/comment-display"
import type { Comment } from "../types/comment"
import type { CommentSection } from "../types/section"
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
            className="text-xs font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore ? "Caricamento…" : "Carica altri"}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="px-4 py-3 pl-10 text-[12.5px] text-[#9ca3af]">
          Caricamento commenti…
        </p>
      ) : sortedComments.length === 0 ? (
        <p
          className="px-4 pt-3.5 pb-4 pl-10 text-[12.5px] text-[#b6bcc6]"
          data-testid="comments-empty-state"
        >
          {getEmptySectionCopy(section.kind)}
        </p>
      ) : (
        <div className="py-1.5">
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

type CommentSectionsAccordionProps = {
  sections: CommentSection[]
  activeSectionId: string
  onSectionChange: (sectionId: string) => void
  onCommenta: (section: CommentSection) => void
  renderSectionContent: (section: CommentSection) => React.ReactNode
}

export function CommentSectionsAccordion({
  sections,
  activeSectionId,
  onSectionChange,
  onCommenta,
  renderSectionContent,
}: CommentSectionsAccordionProps) {
  return (
    <div>
      {sections.map((section) => {
        const isActive = section.id === activeSectionId
        const subtitle = getSectionSubtitle(section.displayName, section.typeLabel)
        return (
          <section key={section.id} className="border-b border-[#eef0f3]">
            <div className="sticky top-0 z-2 flex items-center gap-2 border-b border-[#eef0f3] bg-[#F8F9FA]/95 px-3.5 py-2.5 backdrop-blur-[6px]">
              <button
                type="button"
                data-testid={`comments-section-toggle-${section.id}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                aria-expanded={isActive}
                onClick={() => onSectionChange(section.id)}
              >
                <span
                  aria-hidden
                  className="w-4.5 shrink-0 text-center text-sm leading-none"
                >
                  {section.icon}
                </span>
                <span className="shrink-0 text-[11px] font-bold tracking-[0.04em] text-[#374151] uppercase">
                  {section.typeLabel}
                </span>
                {subtitle ? (
                  <span className="truncate text-[11.5px] font-medium text-[#9ca3af]">
                    {subtitle}
                  </span>
                ) : null}
              </button>
              {section.kind === "descendants" ? null : (
                <button
                  type="button"
                  data-testid={`comments-section-commenta-${section.id}`}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-1 rounded-[7px] px-2 py-1",
                    "text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF]",
                  )}
                  onClick={() => onCommenta(section)}
                >
                  <span aria-hidden className="text-[13px] leading-none">
                    +
                  </span>{" "}
                  Commenta
                </button>
              )}
            </div>
            {isActive ? renderSectionContent(section) : null}
          </section>
        )
      })}
    </div>
  )
}
