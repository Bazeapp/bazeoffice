import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { getEmptySectionCopy, sortSectionComments } from "../lib/comment-display"
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
    <div className="space-y-3" data-testid={`comments-section-${section.id}`}>
      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="comments-load-more"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore ? "Caricamento…" : "Carica altri"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento commenti…</p>
      ) : sortedComments.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="comments-empty-state">
          {getEmptySectionCopy(section.kind)}
        </p>
      ) : (
        <div className="space-y-3">
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
    <Accordion
      type="single"
      collapsible
      tone="flush"
      value={activeSectionId}
      onValueChange={(value) => {
        if (value) onSectionChange(value)
      }}
    >
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger
            plain
            icon={<span aria-hidden>{section.icon}</span>}
            titleAction={
              section.kind === "descendants" ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  data-testid={`comments-section-commenta-${section.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onCommenta(section)
                  }}
                >
                  + Commenta
                </Button>
              )
            }
          >
            {section.typeLabel} · {section.displayName}
          </AccordionTrigger>
          <AccordionContent>
            {renderSectionContent(section)}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
