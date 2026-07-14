import { beforeEach, describe, expect, it } from "vitest"

import { createMentionChip, deleteMentionChipBeforeCaret, getMarkupCaretOffset, renderComposerMarkup, serializeComposerMarkup, setMarkupCaretOffset } from "../mention-composer-dom"
import { formatMentionMarkup } from "../mention-markup"

function createEditor(): HTMLDivElement {
  const root = document.createElement("div")
  document.body.appendChild(root)
  return root
}

describe("mention-composer-dom", () => {
  let root: HTMLDivElement

  beforeEach(() => {
    root = createEditor()
  })

  it("renders mention markup as non-editable chips and round-trips plain text", () => {
    const markup = `Ciao ${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}!`

    renderComposerMarkup(root, markup)

    expect(root.querySelector('[data-testid="comments-mention-chip"]')).toHaveTextContent(
      "@Marco Conti",
    )
    expect(serializeComposerMarkup(root)).toBe(markup)
  })

  it("maps caret offsets between markup and the rendered editor", () => {
    const markup = `Ciao ${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}!`
    renderComposerMarkup(root, markup)

    setMarkupCaretOffset(root, 5)
    expect(getMarkupCaretOffset(root)).toBe(5)

    setMarkupCaretOffset(root, markup.length)
    expect(getMarkupCaretOffset(root)).toBe(markup.length)
  })

  it("deletes the entire mention chip on backspace instead of one character", () => {
    const markup = `Ciao ${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}`
    renderComposerMarkup(root, markup)
    setMarkupCaretOffset(root, markup.length)

    const deleted = deleteMentionChipBeforeCaret(root)
    expect(deleted).toBe(true)
    expect(serializeComposerMarkup(root)).toBe("Ciao ")
    expect(root.querySelector('[data-testid="comments-mention-chip"]')).toBeNull()
  })

  it("deletes the entire mention chip when the caret is before trailing text", () => {
    const markup = `Ciao ${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}!`
    renderComposerMarkup(root, markup)
    setMarkupCaretOffset(root, markup.indexOf("!"))

    const deleted = deleteMentionChipBeforeCaret(root)
    expect(deleted).toBe(true)
    expect(serializeComposerMarkup(root)).toBe("Ciao !")
    expect(root.querySelector('[data-testid="comments-mention-chip"]')).toBeNull()
  })

  it("creates mention chips that cannot be edited directly", () => {
    const chip = createMentionChip("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    expect(chip.contentEditable).toBe("false")
    expect(chip).toHaveClass("text-accent-ink")
  })
})
