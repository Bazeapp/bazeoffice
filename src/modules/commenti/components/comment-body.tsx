import { parseMentionMarkup } from "../lib/mention-markup"

type CommentBodyProps = {
  body: string
}

export function CommentBody({ body }: CommentBodyProps) {
  const parts = parseMentionMarkup(body)

  return (
    <p
      className="text-[13px] leading-normal whitespace-pre-wrap text-[#28303f]"
      data-testid="comments-body"
    >
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
