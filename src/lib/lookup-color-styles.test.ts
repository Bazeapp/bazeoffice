import { describe, it, expect } from "vitest"

import {
  getLookupBadgeSoftClassName,
  getLookupPanelClassName,
  getLookupToneTextClassName,
  getLookupDropZoneClassName,
  getLookupDropZoneActiveClassName,
} from "@/lib/lookup-color-styles"

describe("lookup color styles", () => {
  it("returns the right class for each of the five style slots of a known color", () => {
    expect(getLookupBadgeSoftClassName("red")).toBe("border-red-200 bg-red-100 text-red-700")
    expect(getLookupPanelClassName("blue")).toBe("border-blue-300 bg-blue-50/70")
    expect(getLookupToneTextClassName("green")).toBe("text-green-700")
    expect(getLookupDropZoneClassName("amber")).toBe(
      "border-amber-300/90 bg-amber-50/45 text-amber-800",
    )
    expect(getLookupDropZoneActiveClassName("red")).toBe("border-red-500 bg-red-100/70")
  })

  it("resolves semantic aliases to their concrete palette", () => {
    expect(getLookupToneTextClassName("positive")).toBe("text-emerald-700") // -> emerald
    expect(getLookupToneTextClassName("negative")).toBe("text-rose-700") // -> rose
    expect(getLookupToneTextClassName("neutral")).toBe("text-sky-700") // -> sky
    expect(getLookupToneTextClassName("muted")).toBe("text-zinc-700") // -> zinc
  })

  it("normalizes case and surrounding whitespace", () => {
    expect(getLookupBadgeSoftClassName("  RED  ")).toBe("border-red-200 bg-red-100 text-red-700")
  })

  it("falls back to the default style set for null, empty, or unknown colors", () => {
    const def = "border-border bg-muted text-foreground"
    expect(getLookupBadgeSoftClassName(null)).toBe(def)
    expect(getLookupBadgeSoftClassName("")).toBe(def)
    expect(getLookupBadgeSoftClassName("chartreuse")).toBe(def)
  })

  it("has a dedicated 'white' style distinct from the default", () => {
    expect(getLookupBadgeSoftClassName("white")).toBe("border-border bg-surface text-foreground")
  })
})
