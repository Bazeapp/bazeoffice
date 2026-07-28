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


const MENTION_CHIP_SELECTOR = '[data-mention-chip="true"]'
const COMPOSER_CARET_ZWSP = "\u200B"

function stripComposerZwsp(text: string): string {
  return text.replaceAll(COMPOSER_CARET_ZWSP, "")
}

function isCaretZwspNode(node: Node | null | undefined): node is Text {
  return (
    node?.nodeType === Node.TEXT_NODE &&
    node.textContent === COMPOSER_CARET_ZWSP
  )
}

function ensureCaretZwspAfter(br: HTMLBRElement): Text {
  const next = br.nextSibling
  if (isCaretZwspNode(next)) {
    return next as Text
  }

  const zwsp = document.createTextNode(COMPOSER_CARET_ZWSP)
  br.parentNode?.insertBefore(zwsp, br.nextSibling)
  return zwsp
}

function placeSelectionAfterLineBreak(
  br: HTMLBRElement,
  selection: Selection,
): void {
  const range = document.createRange()
  const isTrailingLineBreak = !br.nextSibling || isCaretZwspNode(br.nextSibling)

  if (isTrailingLineBreak) {
    const zwsp = ensureCaretZwspAfter(br)
    range.setStart(zwsp, zwsp.length)
  } else {
    range.setStartAfter(br)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function insertLineBreakAtSelection(root: HTMLElement, range: Range): HTMLBRElement {
  const br = document.createElement("br")

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer as Text
    const offset = range.startOffset
    const textLength = textNode.textContent?.length ?? 0
    const parent = textNode.parentNode
    if (!parent) return br

    if (
      offset === textLength &&
      parent instanceof HTMLElement &&
      isComposerTextSpan(parent)
    ) {
      parent.parentNode?.insertBefore(br, parent.nextSibling)
      return br
    }

    if (offset > 0 && offset < textLength) {
      const after = textNode.splitText(offset)
      parent.insertBefore(br, after)
      return br
    }

    if (offset === 0) {
      parent.insertBefore(br, textNode)
      return br
    }

    if (offset === textLength) {
      parent.insertBefore(br, textNode.nextSibling)
      return br
    }
  }

  if (range.startContainer === root) {
    const reference = root.childNodes[range.startOffset] ?? null
    if (reference) {
      root.insertBefore(br, reference)
    } else {
      root.appendChild(br)
    }
    return br
  }

  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    const element = range.startContainer
    const reference = element.childNodes[range.startOffset] ?? null
    if (reference) {
      element.insertBefore(br, reference)
    } else {
      element.appendChild(br)
    }
    return br
  }

  range.insertNode(br)
  return br
}

export function isMentionChip(node: Node | null | undefined): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    node.dataset.mentionChip === "true" &&
    Boolean(node.dataset.userId) &&
    Boolean(node.dataset.mentionLabel)
  )
}

function mentionMarkupLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    if (isCaretZwspNode(node)) return 0
    return stripComposerZwsp(node.textContent ?? "").length
  }
  if (isMentionChip(node)) {
    return formatMentionMarkup(node.dataset.mentionLabel!, node.dataset.userId!).length
  }
  if (node.nodeName === "BR") {
    return 1
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    let length = 0
    for (const child of node.childNodes) {
      length += mentionMarkupLength(child)
    }
    return length
  }
  return 0
}

export function createMentionChip(label: string, userId: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.contentEditable = "false"
  span.dataset.mentionChip = "true"
  span.dataset.userId = userId
  span.dataset.mentionLabel = label
  span.setAttribute("data-testid", "comments-mention-chip")
  span.className = "font-medium text-accent-ink"
  span.textContent = `@${label}`
  return span
}

function createTextSpan(text: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.appendChild(document.createTextNode(text))
  return span
}

function appendTextWithLineBreaks(root: HTMLElement, value: string): void {
  const lines = value.split("\n")
  lines.forEach((line, index) => {
    if (line) {
      root.appendChild(createTextSpan(line))
    }
    if (index < lines.length - 1) {
      root.appendChild(document.createElement("br"))
    }
  })
}

function isComposerTextSpan(node: Node): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    node.tagName === "SPAN" &&
    node.dataset.mentionChip !== "true"
  )
}

function isComposerBlockElement(node: Node): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    (node.tagName === "DIV" || node.tagName === "P")
  )
}

function shouldTraverseComposerElement(node: Node): boolean {
  return isComposerTextSpan(node) || isComposerBlockElement(node)
}

function isInlineOnlyBlockContent(children: Node[]): boolean {
  return (
    children.length > 0 &&
    children.every(
      (child) =>
        child.nodeType === Node.TEXT_NODE ||
        child.nodeName === "BR" ||
        isMentionChip(child) ||
        (child instanceof HTMLElement &&
          child.tagName === "SPAN" &&
          child.dataset.mentionChip !== "true"),
    )
  )
}

function unwrapComposerBlock(block: HTMLElement): void {
  const parent = block.parentElement
  if (!parent) return

  const children = Array.from(block.childNodes)
  const previous = block.previousSibling

  const isEmptyLine =
    children.length === 0 ||
    (children.length === 1 && children[0]?.nodeName === "BR")

  if (isEmptyLine) {
    if (!previous || previous.nodeName !== "BR") {
      parent.insertBefore(document.createElement("br"), block)
    }
    block.remove()
    return
  }

  const hasTrailingBr =
    children.length > 0 && children[children.length - 1]?.nodeName === "BR"
  const onlyInlineWithoutTrailingBr =
    isInlineOnlyBlockContent(children) && !hasTrailingBr

  const continuesAfterMention =
    previous !== null &&
    isMentionChip(previous) &&
    isInlineOnlyBlockContent(children)

  const shouldMergeInlineWithPrevious =
    onlyInlineWithoutTrailingBr && continuesAfterMention

  const shouldMergeLineWithTrailingBr = hasTrailingBr && continuesAfterMention

  if (
    !shouldMergeInlineWithPrevious &&
    !shouldMergeLineWithTrailingBr &&
    previous &&
    previous.nodeName !== "BR"
  ) {
    parent.insertBefore(document.createElement("br"), block)
  }

  for (const child of children) {
    parent.insertBefore(child, block)
  }
  block.remove()
}

export function normalizeComposerDom(root: HTMLElement): void {
  let block = root.querySelector(":scope > div, :scope > p")
  while (block instanceof HTMLElement) {
    unwrapComposerBlock(block)
    block = root.querySelector(":scope > div, :scope > p")
  }
}

export function insertComposerLineBreak(root: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer)) return

  range.deleteContents()
  const br = insertLineBreakAtSelection(root, range)
  placeSelectionAfterLineBreak(br, selection)
}

export function renderComposerMarkup(root: HTMLElement, markup: string): void {
  root.replaceChildren()
  for (const part of parseMentionMarkup(markup)) {
    if (part.type === "text") {
      appendTextWithLineBreaks(root, part.value)
      continue
    }
    root.appendChild(createMentionChip(part.label, part.userId))
  }
}

export function serializeComposerMarkup(root: HTMLElement): string {
  let markup = ""

  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (isCaretZwspNode(node)) {
        continue
      }
      markup += stripComposerZwsp(node.textContent ?? "")
      continue
    }
    if (isMentionChip(node)) {
      markup += formatMentionMarkup(node.dataset.mentionLabel!, node.dataset.userId!)
      continue
    }
    if (node.nodeName === "BR") {
      markup += "\n"
      continue
    }
    if (isComposerTextSpan(node)) {
      markup += serializeComposerMarkup(node)
      continue
    }
    if (isComposerBlockElement(node)) {
      if (markup.length > 0 && !markup.endsWith("\n")) {
        markup += "\n"
      }
      markup += serializeComposerMarkup(node)
      continue
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      markup += serializeComposerMarkup(node as HTMLElement)
    }
  }

  return markup
}

export function getMarkupCaretOffset(
  root: HTMLElement,
  selection: Selection | null = window.getSelection(),
): number {
  if (!selection || selection.rangeCount === 0) {
    return 0
  }

  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer)) {
    return 0
  }

  let offset = 0
  let found = false

  const visit = (node: Node): boolean => {
    if (found) return true

    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!isCaretZwspNode(node)) {
          offset += range.startOffset
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let index = 0; index < range.startOffset; index += 1) {
          offset += mentionMarkupLength(node.childNodes[index]!)
        }
      }
      found = true
      return true
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (isCaretZwspNode(node)) {
        return false
      }
      offset += mentionMarkupLength(node)
      return false
    }

    if (shouldTraverseComposerElement(node)) {
      for (const child of node.childNodes) {
        if (visit(child)) return true
      }
      return false
    }

    offset += mentionMarkupLength(node)
    return false
  }

  for (const child of root.childNodes) {
    if (visit(child)) break
  }

  return offset
}

export function setMarkupCaretOffset(
  root: HTMLElement,
  targetOffset: number,
  selection: Selection | null = window.getSelection(),
): void {
  if (!selection) return

  const range = document.createRange()
  let remaining = Math.max(0, targetOffset)
  let placed = false

  const placeAtStart = (node: Node) => {
    range.setStart(node, 0)
    range.collapse(true)
    placed = true
  }

  const visit = (node: Node): void => {
    if (placed) return

    if (node.nodeType === Node.TEXT_NODE) {
      if (isCaretZwspNode(node)) {
        return
      }

      const length = stripComposerZwsp(node.textContent ?? "").length
      if (remaining <= length) {
        range.setStart(node, remaining)
        range.collapse(true)
        placed = true
        return
      }
      remaining -= length
      return
    }

    if (isMentionChip(node)) {
      const length = formatMentionMarkup(
        node.dataset.mentionLabel!,
        node.dataset.userId!,
      ).length
      if (remaining <= length) {
        range.setStartAfter(node)
        range.collapse(true)
        placed = true
        return
      }
      remaining -= length
      return
    }

    if (node.nodeName === "BR") {
      if (remaining === 0) {
        placeAtStart(node)
        return
      }
      if (remaining === 1) {
        const zwsp = ensureCaretZwspAfter(node as HTMLBRElement)
        range.setStart(zwsp, zwsp.length)
        range.collapse(true)
        placed = true
        return
      }
      remaining -= 1
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.childNodes.length === 0 && remaining === 0) {
        placeAtStart(node)
        return
      }
      for (const child of node.childNodes) {
        visit(child)
        if (placed) return
      }
    }
  }

  for (const child of root.childNodes) {
    visit(child)
    if (placed) break
  }

  if (!placed) {
    range.selectNodeContents(root)
    range.collapse(false)
  }

  selection.removeAllRanges()
  selection.addRange(range)
}

export function findMentionChipBeforeCaret(
  root: HTMLElement,
  range: Range,
): HTMLElement | null {
  if (!range.collapsed || !root.contains(range.startContainer)) {
    return null
  }

  const { startContainer, startOffset } = range

  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset === 0) {
      const previous = startContainer.previousSibling
      if (isMentionChip(previous)) {
        return previous
      }
    }
    return null
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    if (startOffset > 0) {
      const previous = startContainer.childNodes[startOffset - 1]
      if (isMentionChip(previous)) {
        return previous
      }
    }
  }

  return null
}

export function deleteMentionChipBeforeCaret(
  root: HTMLElement,
  selection: Selection | null = window.getSelection(),
): boolean {
  if (!selection || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  const mention = findMentionChipBeforeCaret(root, range)
  if (!mention) {
    return false
  }

  const parent = mention.parentNode
  if (!parent) {
    return false
  }

  const nextSibling = mention.nextSibling
  mention.remove()

  const newRange = document.createRange()
  if (nextSibling) {
    if (nextSibling.nodeType === Node.TEXT_NODE) {
      newRange.setStart(nextSibling, 0)
    } else {
      newRange.setStartBefore(nextSibling)
    }
  } else {
    newRange.setStart(parent, parent.childNodes.length)
  }
  newRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(newRange)
  return true
}

export function queryMentionChips(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(MENTION_CHIP_SELECTOR))
}
