/**
 * FamilyCommentsSection — footer commenti collassabile del detail sheet.
 * Vedi spec `outputs/04_spec/domain/family-comments-section.md`.
 */
import * as React from "react"
import { ChevronDownIcon, MessageSquareTextIcon, SendIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { FamilyComment } from "@/pages/_dev-family-mock-data"

type FamilyCommentsSectionProps = {
  comments: FamilyComment[]
  onAddComment?: (text: string) => void
  label?: string
  defaultOpen?: boolean
  inputPlaceholder?: string
  className?: string
}

export function FamilyCommentsSection({
  comments,
  onAddComment,
  label = "Commenti",
  defaultOpen = false,
  inputPlaceholder = "Scrivi un commento…",
  className,
}: FamilyCommentsSectionProps) {
  const [draft, setDraft] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    onAddComment?.(draft.trim())
    setDraft("")
  }

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("border-t border-border bg-background", className)}
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40">
        <MessageSquareTextIcon className="size-3.5 text-muted-foreground" />
        <span>{label}</span>
        <span className="text-muted-foreground">({comments.length})</span>
        <span className="flex-1" />
        <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-data-open:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 border-t border-border/60 px-5 py-3">
          {comments.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nessun commento ancora.</p>
          ) : (
            <ol className="space-y-2.5">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                    {c.authorInitials}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-[12px]">
                      <strong className="font-semibold text-foreground">
                        {c.authorName}
                      </strong>
                      <span className="text-muted-foreground"> · {c.timestamp}</span>
                    </div>
                    <p className="text-[12px] text-foreground">{c.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {onAddComment ? (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1"
            >
              <MessageSquareTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={!draft.trim()}
                aria-label="Invia commento"
              >
                <SendIcon className="size-3.5" />
              </Button>
            </form>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
