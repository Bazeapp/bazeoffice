import { parseMentionMarkup } from "../lib/mention-markup"

type CommentBodyProps = {
  body: string
}

export function CommentBody({ body }: CommentBodyProps) {
  const parts = parseMentionMarkup(body)

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="comments-body">
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <span
              key={`${part.userId}-${index}`}
              className="font-medium text-blue-600"
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
