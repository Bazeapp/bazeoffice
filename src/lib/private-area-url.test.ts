import { describe, it, expect } from "vitest"

import {
  buildFamilyPrivateAreaUrl,
  buildFamilyPresenzeUrl,
} from "@/lib/private-area-url"

// URLs are asserted by parsing the result and checking query params, so the
// tests don't break on incidental encoding differences.

describe("buildFamilyPrivateAreaUrl", () => {
  it("derives the sort token from the last dash segment of the family id", () => {
    const url = buildFamilyPrivateAreaUrl("mario@x.com", "fam-abc-123def")
    expect(url).not.toBeNull()
    const parsed = new URL(url as string)
    expect(parsed.origin + parsed.pathname).toBe("https://app.bazeapp.com/v2/auth/entry-point")
    expect(parsed.searchParams.get("email")).toBe("mario@x.com")
    expect(parsed.searchParams.get("sort")).toBe("123def")
    expect(parsed.searchParams.get("utm_source")).toBe("entry_point")
  })

  it("uses the last 12 chars as sort when the id has no dash", () => {
    const url = buildFamilyPrivateAreaUrl("mario@x.com", "abcdefghijklmnop")
    expect(new URL(url as string).searchParams.get("sort")).toBe("efghijklmnop")
  })

  it("returns null when email or family id is missing or the '-' placeholder", () => {
    expect(buildFamilyPrivateAreaUrl("-", "fam-abc-123")).toBeNull()
    expect(buildFamilyPrivateAreaUrl("", "fam-abc-123")).toBeNull()
    expect(buildFamilyPrivateAreaUrl("mario@x.com", null)).toBeNull()
    expect(buildFamilyPrivateAreaUrl(123, "fam-abc-123")).toBeNull()
  })
})

describe("buildFamilyPresenzeUrl", () => {
  it("adds the presenze utm_source and go_to deep-link params", () => {
    const url = buildFamilyPresenzeUrl("mario@x.com", "fam-abc-123def")
    expect(url).not.toBeNull()
    const parsed = new URL(url as string)
    expect(parsed.searchParams.get("email")).toBe("mario@x.com")
    expect(parsed.searchParams.get("sort")).toBe("123def")
    expect(parsed.searchParams.get("utm_source")).toBe("link_invio_presenze")
    expect(parsed.searchParams.get("go_to")).toBe("/famiglie/presenze")
  })

  it("returns null when inputs are invalid", () => {
    expect(buildFamilyPresenzeUrl("mario@x.com", "-")).toBeNull()
  })
})
