import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import {
  invalidateCommentVisibility,
  shouldInvalidateCommentQueryForAnchor,
} from "../invalidate-comment-visibility"

const LAVORATORE = {
  entityType: "lavoratore" as const,
  entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
}

const CANDIDATURA = {
  entityType: "candidatura" as const,
  entityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
}

const RICERCA = {
  entityType: "ricerca" as const,
  entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
}

describe("invalidate-comment-visibility", () => {
  it("invalidates lavoratore section queries on candidatura pages when gate writes", () => {
    const candidaturaSectionKey = [
      "commenti",
      CANDIDATURA.entityType,
      CANDIDATURA.entityId,
      "section",
      LAVORATORE.entityType,
      LAVORATORE.entityId,
      null,
    ] as const

    expect(
      shouldInvalidateCommentQueryForAnchor(
        candidaturaSectionKey,
        LAVORATORE,
        LAVORATORE,
      ),
    ).toBe(true)
  })

  it("invalidates candidatura count caches when a lavoratore comment is created elsewhere", () => {
    const candidaturaCountKey = [
      "commenti",
      CANDIDATURA.entityType,
      CANDIDATURA.entityId,
      "count",
    ] as const

    expect(
      shouldInvalidateCommentQueryForAnchor(candidaturaCountKey, LAVORATORE, LAVORATORE),
    ).toBe(true)
  })

  it("does not invalidate unrelated ricerca caches for lavoratore anchors", () => {
    const ricercaCountKey = [
      "commenti",
      RICERCA.entityType,
      RICERCA.entityId,
      "count",
    ] as const

    expect(
      shouldInvalidateCommentQueryForAnchor(ricercaCountKey, LAVORATORE, LAVORATORE),
    ).toBe(false)
  })

  it("invalidates cross-page caches through the query client", async () => {
    const queryClient = new QueryClient()
    const candidaturaSectionKey = [
      "commenti",
      CANDIDATURA.entityType,
      CANDIDATURA.entityId,
      "section",
      LAVORATORE.entityType,
      LAVORATORE.entityId,
      null,
    ] as const

    queryClient.setQueryData(candidaturaSectionKey, { comments: [], nextCursor: null })

    invalidateCommentVisibility(queryClient, LAVORATORE, LAVORATORE)

    expect(queryClient.getQueryState(candidaturaSectionKey)?.isInvalidated).toBe(true)
  })
})
