import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { renderHookWithQueryClient } from "@/test/test-utils"

type BoardData = { columns: { id: string; cards: { id: string }[] }[] }

describe("useBoardQueryCache", () => {
  it("setBoardData applies updater to cached data", () => {
    const queryKey = ["test-board"] as const
    const queryClient = new QueryClient()
    queryClient.setQueryData<BoardData>(queryKey, {
      columns: [{ id: "a", cards: [{ id: "1" }] }],
    })

    const { result } = renderHookWithQueryClient(
      () => useBoardQueryCache<BoardData>(queryKey),
      { client: queryClient },
    )

    result.current.setBoardData((prev) =>
      prev
        ? { columns: prev.columns.map((c) => ({ ...c, cards: [...c.cards, { id: "2" }] })) }
        : prev,
    )

    expect(queryClient.getQueryData<BoardData>(queryKey)?.columns[0]?.cards).toHaveLength(2)
  })

  it("invalidateBoard calls queryClient.invalidateQueries", async () => {
    const queryKey = ["test-board-invalidate"] as const
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHookWithQueryClient(
      () => useBoardQueryCache(queryKey),
      { client: queryClient },
    )

    await result.current.invalidateBoard()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey })
  })
})
