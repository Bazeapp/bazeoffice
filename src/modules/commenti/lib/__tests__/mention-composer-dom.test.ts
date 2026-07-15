import { beforeEach, describe, expect, it } from "vitest"

import { createMentionChip, deleteMentionChipBeforeCaret, getMarkupCaretOffset, insertComposerLineBreak, normalizeComposerDom, renderComposerMarkup, serializeComposerMarkup, setMarkupCaretOffset } from "../mention-composer-dom"
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

  it("renders plain text segments as inline spans", () => {
    renderComposerMarkup(root, "Ciao mondo")

    const spans = root.querySelectorAll(":scope > span")
    expect(spans).toHaveLength(1)
    expect(spans[0]).toHaveTextContent("Ciao mondo")
    expect(spans[0]?.querySelector("div")).toBeNull()
  })

  it("keeps trailing text inline when a browser wraps it in a div after a mention", () => {
    const chip = createMentionChip("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    const block = document.createElement("div")
    block.appendChild(document.createTextNode("ciao"))
    block.appendChild(document.createElement("br"))

    root.appendChild(chip)
    root.appendChild(block)

    normalizeComposerDom(root)

    expect(root.querySelector("div")).toBeNull()
    expect(serializeComposerMarkup(root)).toBe(
      `${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}ciao\n`,
    )
  })

  it("inserts line breaks without creating block wrappers", () => {
    const markup = `Ciao ${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}!`
    renderComposerMarkup(root, markup)
    setMarkupCaretOffset(root, markup.length)

    insertComposerLineBreak(root)
    normalizeComposerDom(root)

    expect(root.querySelector(":scope > div")).toBeNull()
    expect(serializeComposerMarkup(root)).toBe(`${markup}\n`)
  })

  it("creates a newline after a mention and trailing text on the first enter", () => {
    const markup = `${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")} ciao`
    renderComposerMarkup(root, markup)
    setMarkupCaretOffset(root, markup.length)

    insertComposerLineBreak(root)

    expect(serializeComposerMarkup(root)).toBe(`${markup}\n`)
    expect(getMarkupCaretOffset(root)).toBe(markup.length + 1)
    expect(root.querySelector(":scope > br")).not.toBeNull()
    expect(root.querySelector(":scope > span:last-of-type br")).toBeNull()
  })

  it("restores the caret after a newline when re-rendering from markup", () => {
    const markup = `${formatMentionMarkup("Marco Conti", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")} ciao\n`
    renderComposerMarkup(root, markup)
    setMarkupCaretOffset(root, markup.length)

    expect(getMarkupCaretOffset(root)).toBe(markup.length)
  })
})
