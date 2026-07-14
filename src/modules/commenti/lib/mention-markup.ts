export type MentionMarkupPart =
  | { type: "text"; value: string }
  | { type: "mention"; label: string; userId: string }

const MENTION_PATTERN =
  /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export function formatMentionMarkup(label: string, userId: string): string {
  return `@[${label}](${userId})`
}

export function parseMentionMarkup(body: string): MentionMarkupPart[] {
  if (!body) return []

  const parts: MentionMarkupPart[] = []
  let lastIndex = 0
  const pattern = new RegExp(MENTION_PATTERN.source, "gi")

  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, index) })
    }
    parts.push({
      type: "mention",
      label: match[1] ?? "",
      userId: match[2] ?? "",
    })
    lastIndex = index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) })
  }

  return parts
}

export type MentionTriggerState = {
  start: number
  query: string
}

export function getMentionTriggerState(
  value: string,
  cursor: number,
): MentionTriggerState | null {
  const before = value.slice(0, cursor)
  const atIndex = before.lastIndexOf("@")
  if (atIndex === -1) return null

  const previous = before[atIndex - 1]
  if (previous && !/\s/.test(previous)) return null

  const query = before.slice(atIndex + 1)
  if (query.includes("\n") || query.includes("[") || query.includes("]")) {
    return null
  }

  return { start: atIndex, query }
}

export function insertMentionMarkup(
  value: string,
  cursor: number,
  trigger: MentionTriggerState,
  label: string,
  userId: string,
): { nextValue: string; nextCursor: number } {
  const mention = formatMentionMarkup(label, userId)
  const nextValue =
    value.slice(0, trigger.start) + mention + value.slice(cursor)
  const nextCursor = trigger.start + mention.length
  return { nextValue, nextCursor }
}

export function filterOperatorsByQuery<T extends { id: string; label: string }>(
  operators: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return operators
  return operators.filter((operator) =>
    operator.label.toLowerCase().includes(normalized),
  )
}

export function partitionInvolvedOperators<T extends { id: string }>(
  operators: T[],
  involvedIds: string[],
): { involved: T[]; others: T[] } {
  const involvedSet = new Set(involvedIds)
  const involved: T[] = []
  const others: T[] = []

  for (const operator of operators) {
    if (involvedSet.has(operator.id)) {
      involved.push(operator)
    } else {
      others.push(operator)
    }
  }

  return { involved, others }
}
