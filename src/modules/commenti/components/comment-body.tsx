import { cn } from "@/lib/utils"

import { parseMentionMarkup } from "../lib/mentions"

type CommentBodyProps = {
  body: string
  className?: string
}

export function CommentBody({ body, className }: CommentBodyProps) {
  const parts = parseMentionMarkup(body)

  return (
    <p
      className={cn(
        "text-sm leading-normal whitespace-pre-wrap text-foreground-strong",
        className,
      )}
      data-testid="comments-body"
    >
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <span
              key={`${part.userId}-${index}`}
              className="font-medium text-accent-ink"
              data-testid="comments-mention-highlight"
            >
              @{part.label}
            </span>
          )
        }
        return <span key={`text-${index}`}>{part.value}</span>
      })}
    </p>
  )
}
