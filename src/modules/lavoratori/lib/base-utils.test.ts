import { describe, it, expect } from "vitest"

import { asInputValue, asString, toAvatarImage, toAvatarUrl } from "./base-utils"

describe("asString", () => {
  it("returns the string trimmed", () => {
    expect(asString("  hello  ")).toBe("hello")
  })

  it("returns '' for null / undefined", () => {
    expect(asString(null)).toBe("")
    expect(asString(undefined)).toBe("")
  })

  it("returns '' for non-string runtime values", () => {
    // These call sites slip through when the value is typed as `unknown`
    // (e.g. rows from `Record<string, unknown>`). The numeric overload
    // forbids passing a value statically typed as `number`, but runtime
    // numbers reaching here still produce "" — by design.
    expect(asString(12 as unknown)).toBe("")
    expect(asString({} as unknown)).toBe("")
    expect(asString([] as unknown)).toBe("")
  })
})

describe("asInputValue", () => {
  it("returns strings unchanged (no trim, preserves user whitespace)", () => {
    expect(asInputValue("  12  ")).toBe("  12  ")
    expect(asInputValue("")).toBe("")
  })

  it("converts finite numbers to their string representation", () => {
    expect(asInputValue(0)).toBe("0")
    expect(asInputValue(12)).toBe("12")
    expect(asInputValue(-3.5)).toBe("-3.5")
  })

  it("returns '' for non-finite numbers and nullish values", () => {
    expect(asInputValue(Number.NaN)).toBe("")
    expect(asInputValue(Number.POSITIVE_INFINITY)).toBe("")
    expect(asInputValue(Number.NEGATIVE_INFINITY)).toBe("")
    expect(asInputValue(null)).toBe("")
    expect(asInputValue(undefined)).toBe("")
  })

  it("returns '' for non-string / non-number values", () => {
    expect(asInputValue({})).toBe("")
    expect(asInputValue([])).toBe("")
    expect(asInputValue(true)).toBe("")
  })
})

describe("toAvatarImage", () => {
  const publicUrl = (path: string) =>
    `http://localhost:54321/storage/v1/object/public/${path}`

  it("threads the stored MIME for a HEIC photo whose filename has no .heic extension", () => {
    // The onboarding pipeline stores photos with opaque names and no extension;
    // only the `type` field marks them as HEIC. Extension-based detection would
    // miss this — the avatar must key off the MIME.
    const row = {
      foto: [
        {
          name: "opaque",
          path: "baze-bucket/lavoratori/opaque",
          type: "image/heic",
        },
      ],
    }

    expect(toAvatarImage(row)).toEqual({
      url: publicUrl("baze-bucket/lavoratori/opaque"),
      type: "image/heic",
    })
  })

  it("carries the MIME of the first resolvable photo (renderable formats too)", () => {
    const row = {
      foto: [
        { name: "p.jpg", path: "baze-bucket/lavoratori/p.jpg", type: "image/jpeg" },
        { name: "x.heic", path: "baze-bucket/lavoratori/x.heic", type: "image/heic" },
      ],
    }

    expect(toAvatarImage(row)).toEqual({
      url: publicUrl("baze-bucket/lavoratori/p.jpg"),
      type: "image/jpeg",
    })
  })

  it("returns null when there is no usable photo", () => {
    expect(toAvatarImage({ foto: [] })).toBeNull()
    expect(toAvatarImage({})).toBeNull()
  })

  it("toAvatarUrl still returns just the url (backward compatible)", () => {
    const row = {
      foto: [{ path: "baze-bucket/lavoratori/x.heic", type: "image/heic" }],
    }

    expect(toAvatarUrl(row)).toBe(publicUrl("baze-bucket/lavoratori/x.heic"))
  })
})
