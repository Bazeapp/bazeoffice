import { describe, expect, it } from "vitest"

import { sanitizeFileName } from "@/lib/file-utils"

describe("sanitizeFileName", () => {
  it("normalizes unsafe characters and casing", () => {
    expect(sanitizeFileName("  My Document (Final).PDF  ")).toBe("my-document-final-.pdf")
  })

  it("returns the fallback when the result is empty", () => {
    expect(sanitizeFileName("   ", "cedolino")).toBe("cedolino")
  })
})
