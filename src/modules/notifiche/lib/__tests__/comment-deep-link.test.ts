import { describe, expect, it, vi } from "vitest"

import {
  buildNotificationDeepLinkUrl,
  buildUrlWithComment,
  readBoardEntityIdFromSearch,
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

describe("board entity deep-link search helpers", () => {
  it("reads famiglia / cedolino / contributi ids", () => {
    expect(readBoardEntityIdFromSearch("famiglia", "?famiglia=f1")).toBe("f1")
    expect(readBoardEntityIdFromSearch("cedolino", "cedolino=c1")).toBe("c1")
    expect(readBoardEntityIdFromSearch("contributi", "")).toBeNull()
  })

  it("builds combined notification deep links", () => {
    expect(
      buildNotificationDeepLinkUrl("/pipeline", {
        entityType: "famiglia",
        entityId: "f1",
        commentId: "c1",
      }),
    ).toBe("/pipeline?famiglia=f1&comment=c1")
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

describe("board entity deep-link notifications", () => {
  it("notifies only subscribers of the matching entity type", async () => {
    const {
      notifyBoardEntityDeepLink,
      subscribeBoardEntityDeepLink,
    } = await import("../entity-route-map")

    const famigliaSeen: string[] = []
    const cedolinoSeen: string[] = []
    const unsubFamiglia = subscribeBoardEntityDeepLink("famiglia", (id) => {
      if (id) famigliaSeen.push(id)
    })
    const unsubCedolino = subscribeBoardEntityDeepLink("cedolino", (id) => {
      if (id) cedolinoSeen.push(id)
    })

    notifyBoardEntityDeepLink("famiglia", "fam-1")
    notifyBoardEntityDeepLink("cedolino", "ced-1")

    unsubFamiglia()
    unsubCedolino()

    expect(famigliaSeen).toEqual(["fam-1"])
    expect(cedolinoSeen).toEqual(["ced-1"])
  })

  it("clears the board entity search param after consume", async () => {
    const { clearBoardEntityIdFromSearch } = await import("../entity-route-map")
    const replaceState = vi.spyOn(window.history, "replaceState")
    window.history.replaceState({}, "", "/pipeline?famiglia=fam-1&comment=c1")

    clearBoardEntityIdFromSearch("famiglia")

    expect(replaceState).toHaveBeenLastCalledWith(
      {},
      "",
      "/pipeline?comment=c1",
    )
    replaceState.mockRestore()
  })
})
