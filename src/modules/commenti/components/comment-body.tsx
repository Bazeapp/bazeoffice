import { parseMentionMarkup } from "../lib/mention-markup"

type CommentBodyProps = {
  body: string
}

export function CommentBody({ body }: CommentBodyProps) {
  const parts = parseMentionMarkup(body)

  return (
    <p
      className="text-sm leading-normal whitespace-pre-wrap text-foreground-strong"
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
