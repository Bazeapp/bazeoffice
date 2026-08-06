/**
 * Pattern B: open assunzione sheet re-fetches when detailRefreshTick bumps
 * (realtime reloadOpenDetail), not on every board columns identity change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, waitFor } from "@testing-library/react"

import { renderHookWithQueryClient } from "@/test/test-utils"

import { useAssunzioniBoardView } from "../use-assunzioni-board-view"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData } from "../../types"

const boardState = vi.hoisted(() => ({
  detailRefreshTick: 0,
  columns: [] as AssunzioniBoardColumnData[],
  updateCard: vi.fn(),
  setOpenDetailIdsForRealtime: vi.fn(),
}))

vi.mock("../use-assunzioni-board", () => ({
  useAssunzioniBoard: () => ({
    loading: false,
    error: null,
    columns: boardState.columns,
    loadDeferredColumn: vi.fn(),
    moveCard: vi.fn(),
    updateCard: boardState.updateCard,
    deleteRapporto: vi.fn(),
    detailRefreshTick: boardState.detailRefreshTick,
    setOpenDetailIdsForRealtime: boardState.setOpenDetailIdsForRealtime,
  }),
}))

vi.mock("../../queries/fetch-assunzione-detail", () => ({
  fetchAssunzioneDetail: vi.fn(),
}))

import { fetchAssunzioneDetail } from "../../queries/fetch-assunzione-detail"

const fetchDetail = vi.mocked(fetchAssunzioneDetail)

function makeCard(
  overrides: Partial<AssunzioniBoardCardData> = {},
): AssunzioniBoardCardData {
  return {
    id: "rapp-1",
    processId: null,
    stage: "Avviare pratica",
    process: null,
    assunzione: null,
    lavoratoreAssunzione: null,
    richiestaAttivazione: null,
    rapporto: null,
    lavoratore: null,
    famiglia: null,
    famigliaId: null,
    nomeFamiglia: "Fam",
    nomeLavoratore: "Lav",
    email: "a@a.it",
    telefono: "",
    titoloAnnuncio: "board",
    tipoRapporto: null,
    deadline: "",
    ...overrides,
  }
}

describe("useAssunzioniBoardView — Pattern B detailRefreshTick", () => {
  beforeEach(() => {
    fetchDetail.mockReset()
    boardState.updateCard.mockReset()
    boardState.setOpenDetailIdsForRealtime.mockReset()
    boardState.detailRefreshTick = 0
    boardState.columns = [
      {
        id: "Avviare pratica",
        label: "Avviare pratica",
        color: "#ccc",
        cards: [makeCard({ titoloAnnuncio: "board" })],
        deferred: false,
        loadError: null,
        loaded: true,
        loading: false,
      },
    ]
  })

  it("re-fetches the open sheet when detailRefreshTick increments", async () => {
    fetchDetail
      .mockResolvedValueOnce({
        rapporto: null,
        assunzione: null,
        lavoratoreAssunzione: null,
        richiestaAttivazione: null,
      } as never)
      .mockResolvedValueOnce({
        rapporto: null,
        assunzione: null,
        lavoratoreAssunzione: null,
        richiestaAttivazione: null,
      } as never)

    const { result, rerender } = renderHookWithQueryClient(() =>
      useAssunzioniBoardView(),
    )

    const boardCard = boardState.columns[0]!.cards[0]!
    act(() => {
      result.current.selectCard(boardCard)
    })

    await waitFor(() => {
      expect(fetchDetail).toHaveBeenCalledTimes(1)
    })

    // Board columns identity change alone must NOT re-fetch.
    boardState.columns = [
      {
        ...boardState.columns[0]!,
        cards: [makeCard({ titoloAnnuncio: "board-refresh", email: "other@x.it" })],
      },
    ]
    rerender()
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchDetail).toHaveBeenCalledTimes(1)

    boardState.detailRefreshTick = 1
    rerender()
    await waitFor(() => {
      expect(fetchDetail).toHaveBeenCalledTimes(2)
    })
  })
})
