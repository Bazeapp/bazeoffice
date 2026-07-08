import { describe, expect, it } from "vitest"

import {
  appendRecruiterFeedback,
  buildRecruiterFeedbackEntry,
  parseRecruiterFeedback,
} from "./feedback-utils"

describe("buildRecruiterFeedbackEntry", () => {
  it("stamps the operator name and keeps the text below", () => {
    const entry = buildRecruiterFeedbackEntry("Francesca", "Richiamare alle 18")
    expect(entry).toMatch(/^\[Francesca - \d{2}\/\d{2}\/\d{4}]\nRichiamare alle 18$/)
  })

  it("falls back to a placeholder name and trims the text", () => {
    const entry = buildRecruiterFeedbackEntry("  ", "  ciao  ")
    expect(entry).toMatch(/^\[Operatore - \d{2}\/\d{2}\/\d{4}]\nciao$/)
  })
})

describe("appendRecruiterFeedback", () => {
  it("returns just the stamped entry when there is no existing feedback", () => {
    const result = appendRecruiterFeedback("", "Mario", "primo appunto")
    expect(result).toBe(buildRecruiterFeedbackEntry("Mario", "primo appunto"))
    expect(result.startsWith("\n")).toBe(false)
  })

  it("prepends the new comment (newest first) separated by a blank line", () => {
    const existing = "[Mario - 01/01/2026]\nvecchio appunto"
    const result = appendRecruiterFeedback(existing, "Luca", "nuovo appunto")

    expect(result.endsWith(existing)).toBe(true)
    expect(result).toContain("\n\n")

    const entries = parseRecruiterFeedback(result)
    expect(entries).toHaveLength(2)
    expect(entries[0]?.name).toBe("Luca")
    expect(entries[0]?.text).toBe("nuovo appunto")
    expect(entries[1]?.text).toBe("vecchio appunto")
  })
})
