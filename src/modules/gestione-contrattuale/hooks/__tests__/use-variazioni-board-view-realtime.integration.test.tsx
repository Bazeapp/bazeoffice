/**
 * Pattern B: open variazione sheet re-fetches when detailRefreshTick bumps
 * (realtime reloadOpenDetail), not on every board columns identity change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, waitFor } from "@testing-library/react"

import { renderHookWithQueryClient } from "@/test/test-utils"
import type { VariazioneContrattualeRecord } from "@/types"

import { useVariazioniBoardView } from "../use-variazioni-board-view"
import type { VariazioniBoardCardData, VariazioniBoardColumnData } from "../../types"

const boardState = vi.hoisted(() => ({
  detailRefreshTick: 0,
  columns: [] as VariazioniBoardColumnData[],
  updateCard: vi.fn(),
  setOpenDetailIdsForRealtime: vi.fn(),
}))

vi.mock("../use-variazioni-board", () => ({
  useVariazioniBoard: () => ({
    loading: false,
    error: null,
    columns: boardState.columns,
    rapportoOptions: [],
    createVariazione: vi.fn(),
    moveCard: vi.fn(),
    updateCard: boardState.updateCard,
    detailRefreshTick: boardState.detailRefreshTick,
    setOpenDetailIdsForRealtime: boardState.setOpenDetailIdsForRealtime,
  }),
}))

vi.mock("../../queries/fetch-variazioni-by-ids", () => ({
  fetchVariazioniByIds: vi.fn(),
}))

vi.mock("@/modules/rapporti/queries", () => ({
  fetchRapportiLavorativiByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, groups: [] }),
}))

vi.mock("@/modules/rapporti/lib", () => ({
  enrichRapportoWithRicercaId: vi.fn(async (rapporto: unknown) => rapporto),
}))

import { fetchVariazioniByIds } from "../../queries/fetch-variazioni-by-ids"

const fetchByIds = vi.mocked(fetchVariazioniByIds)

function makeRecord(
  overrides: Partial<VariazioneContrattualeRecord> = {},
): VariazioneContrattualeRecord {
  return {
    id: "var-1",
    data_variazione: "2026-04-01",
    stato: "presa in carico",
    variazione_da_applicare: "board",
    rapporto_lavorativo_id: "rapp-1",
    airtable_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  } as VariazioneContrattualeRecord
}

function makeCard(
  overrides: Partial<VariazioniBoardCardData> = {},
): VariazioniBoardCardData {
  const record = overrides.record ?? makeRecord()
  return {
    id: "var-1",
    stage: "presa in carico",
    record,
    rapporto: null,
    famiglia: null,
    lavoratore: null,
    nomeCompleto: "Mario Rossi",
    dataVariazione: "01/04/2026",
    variazioneDaApplicare: record.variazione_da_applicare,
    ...overrides,
  }
}

describe("useVariazioniBoardView — Pattern B detailRefreshTick", () => {
  beforeEach(() => {
    fetchByIds.mockReset()
    boardState.updateCard.mockReset()
    boardState.setOpenDetailIdsForRealtime.mockReset()
    boardState.detailRefreshTick = 0
    boardState.columns = [
      {
        id: "presa in carico",
        label: "presa in carico",
        color: "#ccc",
        cards: [makeCard({ record: makeRecord({ variazione_da_applicare: "board" }) })],
      },
    ]
  })

  it("re-fetches the open sheet when detailRefreshTick increments", async () => {
    fetchByIds
      .mockResolvedValueOnce({
        rows: [makeRecord({ variazione_da_applicare: "remote-1" })],
        total: 1,
        columns: [],
        groups: [],
      })
      .mockResolvedValueOnce({
        rows: [makeRecord({ variazione_da_applicare: "remote-2" })],
        total: 1,
        columns: [],
        groups: [],
      })

    const { result, rerender } = renderHookWithQueryClient(() =>
      useVariazioniBoardView(),
    )

    const boardCard = boardState.columns[0]!.cards[0]!
    act(() => {
      result.current.selectCard(boardCard)
    })

    await waitFor(() => {
      expect(result.current.sheetProps.card?.variazioneDaApplicare).toBe("remote-1")
    })
    expect(fetchByIds).toHaveBeenCalledTimes(1)

    boardState.columns = [
      {
        ...boardState.columns[0]!,
        cards: [
          makeCard({
            record: makeRecord({ variazione_da_applicare: "board-refresh" }),
            nomeCompleto: "Other",
          }),
        ],
      },
    ]
    rerender()
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchByIds).toHaveBeenCalledTimes(1)

    boardState.detailRefreshTick = 1
    rerender()
    await waitFor(() => {
      expect(result.current.sheetProps.card?.variazioneDaApplicare).toBe("remote-2")
    })
    expect(fetchByIds).toHaveBeenCalledTimes(2)
  })
})
