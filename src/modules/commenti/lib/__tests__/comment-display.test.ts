import { describe, expect, it } from "vitest"

import {
  getAuthorInitials,
  getAvatarColor,
  getSectionSubtitle,
} from "../comment-display"

describe("getAvatarColor", () => {
  it("returns a stable color for the same name", () => {
    expect(getAvatarColor("Mario Rossi")).toBe(getAvatarColor("Mario Rossi"))
  })

  it("returns a hex color from the palette", () => {
    expect(getAvatarColor("Mario Rossi")).toMatch(/^#[0-9a-f]{6}$/)
    expect(getAvatarColor("")).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe("getSectionSubtitle", () => {
  it("hides bare numbers that look like section indices", () => {
    expect(getSectionSubtitle("1", "RICERCA")).toBeNull()
    expect(getSectionSubtitle("42", "RAPPORTO")).toBeNull()
  })

  it("hides subtitles that repeat the type label", () => {
    expect(getSectionSubtitle("Ricerca", "RICERCA")).toBeNull()
    expect(getSectionSubtitle("LAVORATORE", "LAVORATORE")).toBeNull()
  })

  it("keeps meaningful names", () => {
    expect(getSectionSubtitle("Mario Rossi", "LAVORATORE")).toBe("Mario Rossi")
    expect(getSectionSubtitle("", "COLLEGATE")).toBeNull()
  })
})

describe("getAuthorInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getAuthorInitials("Mario Rossi")).toBe("MR")
    expect(getAuthorInitials("Anna Maria Verdi")).toBe("AM")
  })

  it("handles single names and blank input", () => {
    expect(getAuthorInitials("Mario")).toBe("M")
    expect(getAuthorInitials("  ")).toBe("?")
  })
})
