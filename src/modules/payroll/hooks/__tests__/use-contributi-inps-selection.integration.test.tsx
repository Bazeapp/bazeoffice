/**
 * Pattern B: open contributo sheet re-fetches when detailRefreshTick bumps
 * (realtime reloadOpenDetail), not on every board cards identity change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, waitFor } from "@testing-library/react"

import { renderHookWithQueryClient } from "@/test/test-utils"

import { useContributiInpsSelection } from "../use-contributi-inps-selection"
import type { ContributoInpsBoardCardData } from "../../types"

vi.mock("../../queries/fetch-contributi-inps-by-ids", () => ({
  fetchContributiInpsByIds: vi.fn(),
}))

vi.mock("@/modules/rapporti/queries", () => ({
  fetchRapportiLavorativiByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [] }),
}))

vi.mock("@/modules/rapporti/lib", () => ({
  enrichRapportoWithRicercaId: vi.fn(async (rapporto: unknown) => rapporto),
}))

import { fetchContributiInpsByIds } from "../../queries/fetch-contributi-inps-by-ids"

const fetchByIds = vi.mocked(fetchContributiInpsByIds)

function makeCard(
  overrides: Partial<ContributoInpsBoardCardData> & {
    record?: Partial<ContributoInpsBoardCardData["record"]>
  } = {},
): ContributoInpsBoardCardData {
  const id = overrides.id ?? "contrib-1"
  return {
    id,
    stage: "Da richiedere",
    importoLabel: "€ 0",
    pagopaLabel: "€ 0",
    rapporto: null,
    resolvedQuarter: null,
    assunzioneNames: null,
    ...overrides,
    record: {
      id,
      stato_contributi_inps: "Da richiedere",
      importo_contributi_inps: null,
      valore_pagopa: null,
      rapporto_lavorativo_id: null,
      note: "v1",
      ...(overrides.record ?? {}),
    } as ContributoInpsBoardCardData["record"],
  }
}

describe("useContributiInpsSelection — Pattern B detailRefreshTick", () => {
  beforeEach(() => {
    fetchByIds.mockReset()
  })

  it("re-fetches the open sheet when detailRefreshTick increments", async () => {
    const boardCard = makeCard({ record: { note: "board" } })
    fetchByIds
      .mockResolvedValueOnce({
        rows: [{ ...boardCard.record, note: "remote-1" }],
        total: 1,
        columns: [],
      })
      .mockResolvedValueOnce({
        rows: [{ ...boardCard.record, note: "remote-2" }],
        total: 1,
        columns: [],
      })

    const { result, rerender } = renderHookWithQueryClient(
      (props: { cards: ContributoInpsBoardCardData[]; detailRefreshTick: number }) =>
        useContributiInpsSelection(props),
      {
        initialProps: { cards: [boardCard], detailRefreshTick: 0 },
      },
    )

    act(() => {
      result.current.openCard(boardCard.id)
    })

    await waitFor(() => {
      expect(result.current.selectedCard?.record.note).toBe("remote-1")
    })
    expect(fetchByIds).toHaveBeenCalledTimes(1)

    // Board cards identity change alone must NOT re-fetch.
    const nextBoardCards = [{ ...boardCard, importoLabel: "€ 10" }]
    rerender({ cards: nextBoardCards, detailRefreshTick: 0 })
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchByIds).toHaveBeenCalledTimes(1)

    rerender({ cards: nextBoardCards, detailRefreshTick: 1 })
    await waitFor(() => {
      expect(result.current.selectedCard?.record.note).toBe("remote-2")
    })
    expect(fetchByIds).toHaveBeenCalledTimes(2)
  })
})
