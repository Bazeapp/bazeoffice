import { beforeEach, describe, expect, it } from "vitest"

import {
  createMentionChip,
  deleteMentionChipBeforeCaret,
  formatMentionMarkup,
  getMarkupCaretOffset,
  getMentionTriggerState,
  insertComposerLineBreak,
  insertMentionMarkup,
  normalizeComposerDom,
  parseMentionMarkup,
  partitionInvolvedOperators,
  renderComposerMarkup,
  serializeComposerMarkup,
  setMarkupCaretOffset,
} from "../mentions"

describe("mention markup", () => {
  it("formats mention markup with label and user id", () => {
    expect(formatMentionMarkup("Mario Rossi", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(
      "@[Mario Rossi](aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)",
    )
  })

  it("parses mention markup into text and mention parts", () => {
    expect(
      parseMentionMarkup(
        "Ciao @[Mario Rossi](aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)!",
      ),
    ).toEqual([
      { type: "text", value: "Ciao " },
      {
        type: "mention",
        label: "Mario Rossi",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      { type: "text", value: "!" },
    ])
  })

  it("inserts mention markup replacing the active @ query", () => {
    const value = "Ciao @mar"
    const trigger = getMentionTriggerState(value, value.length)
    expect(trigger).toEqual({ start: 5, query: "mar" })

    const result = insertMentionMarkup(
      value,
      value.length,
      trigger!,
      "Mario Rossi",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    )

    expect(result.nextValue).toBe(
      "Ciao @[Mario Rossi](aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)",
    )
    expect(result.nextCursor).toBe(result.nextValue.length)
  })

  it("partitions operators involved in the current context first", () => {
    const operators = [
      { id: "1", label: "Alice" },
      { id: "2", label: "Bob" },
      { id: "3", label: "Carla" },
    ]

    expect(partitionInvolvedOperators(operators, ["2", "3"])).toEqual({
      involved: [
        { id: "2", label: "Bob" },
        { id: "3", label: "Carla" },
      ],
      others: [{ id: "1", label: "Alice" }],
    })
  })
})

function createEditor(): HTMLDivElement {
  const root = document.createElement("div")
  document.body.appendChild(root)
  return root
}

describe("mention composer DOM", () => {
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
