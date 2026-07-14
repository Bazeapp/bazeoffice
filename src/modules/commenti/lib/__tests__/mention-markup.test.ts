import { describe, expect, it } from "vitest"

import {
  formatMentionMarkup,
  getMentionTriggerState,
  insertMentionMarkup,
  parseMentionMarkup,
  partitionInvolvedOperators,
} from "../mention-markup"

describe("mention-markup", () => {
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
