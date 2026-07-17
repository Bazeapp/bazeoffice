import { describe, expect, it } from "vitest"

import {
  buildUrlWithComment,
  readCommentIdFromSearch,
} from "../entity-route-map"

describe("comment deep-link search helpers", () => {
  it("reads comment id from search string", () => {
    expect(readCommentIdFromSearch("?comment=abcd")).toBe("abcd")
    expect(readCommentIdFromSearch("comment=abcd")).toBe("abcd")
    expect(readCommentIdFromSearch("")).toBeNull()
  })

  it("builds pathname with comment query", () => {
    expect(buildUrlWithComment("/ricerca/123", "c1")).toBe("/ricerca/123?comment=c1")
    expect(buildUrlWithComment("/ricerca/123", null)).toBe("/ricerca/123")
  })
})

describe("comment deep-link notifications", () => {
  it("notifies subscribers when a deep link is published", async () => {
    const { notifyCommentDeepLink, subscribeCommentDeepLink } = await import(
      "../entity-route-map"
    )
    const seen: string[] = []
    const unsubscribe = subscribeCommentDeepLink((id) => {
      if (id) seen.push(id)
    })
    notifyCommentDeepLink("comment-abc")
    unsubscribe()
    expect(seen).toEqual(["comment-abc"])
  })
})
