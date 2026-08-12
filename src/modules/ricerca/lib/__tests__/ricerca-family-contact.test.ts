import { describe, expect, it } from "vitest"

import { resolveFamilyContactFieldError } from "../ricerca-family-contact"

describe("resolveFamilyContactFieldError — telefono", () => {
  it("accepts a valid international number", () => {
    expect(resolveFamilyContactFieldError("telefono", "+393401234567")).toBeNull()
  })

  it("accepts a spaced Italian number (normalized before regex)", () => {
    expect(resolveFamilyContactFieldError("telefono", "340 123 4567")).toBeNull()
  })

  it("accepts a bare Italian number (+39 prefixed)", () => {
    expect(resolveFamilyContactFieldError("telefono", "3401234567")).toBeNull()
  })

  it("accepts a 0039-prefixed number", () => {
    expect(resolveFamilyContactFieldError("telefono", "00393401234567")).toBeNull()
  })

  it("rejects a partial intermediate (the BAZ-192 repro)", () => {
    expect(resolveFamilyContactFieldError("telefono", "+3938")).toMatch(/non valido/i)
  })

  it("rejects empty / whitespace as required (mirrors backend 400 on empty)", () => {
    expect(resolveFamilyContactFieldError("telefono", "")).toMatch(/obbligatorio/i)
    expect(resolveFamilyContactFieldError("telefono", "   ")).toMatch(/obbligatorio/i)
  })

  it("rejects a leading-zero number", () => {
    expect(resolveFamilyContactFieldError("telefono", "+0123456789")).toMatch(/non valido/i)
  })
})

describe("resolveFamilyContactFieldError — email", () => {
  it("accepts a valid email", () => {
    expect(resolveFamilyContactFieldError("email", "family@example.co")).toBeNull()
  })

  it("accepts an uppercase email (lowercased before check)", () => {
    expect(resolveFamilyContactFieldError("email", "FAMILY@EXAMPLE.CO")).toBeNull()
  })

  it("rejects a malformed email (no TLD)", () => {
    expect(resolveFamilyContactFieldError("email", "family@example")).toMatch(/non valida/i)
  })

  it("rejects empty as required", () => {
    expect(resolveFamilyContactFieldError("email", "")).toMatch(/obbligatoria/i)
  })

  it("rejects an email with an internal space", () => {
    expect(resolveFamilyContactFieldError("email", "a b@c.co")).toMatch(/non valida/i)
  })
})
