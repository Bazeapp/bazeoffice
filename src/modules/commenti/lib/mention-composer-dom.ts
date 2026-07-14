import { formatMentionMarkup, parseMentionMarkup } from "./mention-markup"

const MENTION_CHIP_SELECTOR = '[data-mention-chip="true"]'

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
    return node.textContent?.length ?? 0
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

function appendTextWithLineBreaks(root: HTMLElement, value: string): void {
  const lines = value.split("\n")
  lines.forEach((line, index) => {
    if (line) {
      root.appendChild(document.createTextNode(line))
    }
    if (index < lines.length - 1) {
      root.appendChild(document.createElement("br"))
    }
  })
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
      markup += node.textContent ?? ""
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
        offset += range.startOffset
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let index = 0; index < range.startOffset; index += 1) {
          offset += mentionMarkupLength(node.childNodes[index]!)
        }
      }
      found = true
      return true
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
      const length = node.textContent?.length ?? 0
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
        range.setStartAfter(node)
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
