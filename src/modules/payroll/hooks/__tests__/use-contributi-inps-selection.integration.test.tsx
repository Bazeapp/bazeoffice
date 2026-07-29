/**
 * Pattern B: open contributo sheet re-fetches when detailRefreshTick bumps
 * (realtime reloadOpenDetail), not on every board cards identity change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, waitFor } from "@testing-library/react"

import { renderHookWithQueryClient } from "@/test/test-utils"

import { useContributiInpsSelection } from "../use-contributi-inps-selection"
import type { ContributoInpsBoardCardData } from "../../types"
import type { ContributoInpsRecord } from "../../types/contributo-inps"

vi.mock("../../queries/fetch-contributi-inps-by-ids", () => ({
  fetchContributiInpsByIds: vi.fn(),
}))

vi.mock("@/modules/rapporti/queries", () => ({
  fetchRapportiLavorativiByIds: vi.fn().mockResolvedValue({
    rows: [],
    total: 0,
    columns: [],
    groups: [],
  }),
}))

vi.mock("@/modules/rapporti/lib", () => ({
  enrichRapportoWithRicercaId: vi.fn(async (rapporto: unknown) => rapporto),
}))

import { fetchContributiInpsByIds } from "../../queries/fetch-contributi-inps-by-ids"

const fetchByIds = vi.mocked(fetchContributiInpsByIds)

function makeRecord(overrides: Partial<ContributoInpsRecord> = {}): ContributoInpsRecord {
  return {
    id: "contrib-1",
    allegato: null,
    data_invio_famiglia: null,
    data_ora_creazione: null,
    importo_contributi_inps: null,
    rapporto_lavorativo_id: null,
    stato_contributi_inps: "Da richiedere",
    ticket_id: null,
    trimestre_id: null,
    valore_pagopa: 1,
    airtable_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

function makeCard(
  overrides: Partial<Omit<ContributoInpsBoardCardData, "record">> & {
    record?: Partial<ContributoInpsRecord>
  } = {},
): ContributoInpsBoardCardData {
  const { record: recordOverrides, ...cardOverrides } = overrides
  const id = cardOverrides.id ?? "contrib-1"
  return {
    id,
    stage: "Da richiedere",
    record: makeRecord({ id, ...recordOverrides }),
    rapporto: null,
    trimestre: null,
    nomeFamiglia: "Fam",
    nomeLavoratore: "Lav",
    nomeCompleto: "Fam – Lav",
    trimestreLabel: "Q1",
    importoLabel: "€ 0",
    pagopaLabel: "€ 0",
    ...cardOverrides,
  }
}

function tableResponse(record: ContributoInpsRecord) {
  return {
    rows: [record],
    total: 1,
    columns: [],
    groups: [],
  }
}

describe("useContributiInpsSelection — Pattern B detailRefreshTick", () => {
  beforeEach(() => {
    fetchByIds.mockReset()
  })

  it("re-fetches the open sheet when detailRefreshTick increments", async () => {
    const boardCard = makeCard({ record: { valore_pagopa: 10 } })
    fetchByIds
      .mockResolvedValueOnce(tableResponse(makeRecord({ valore_pagopa: 100 })))
      .mockResolvedValueOnce(tableResponse(makeRecord({ valore_pagopa: 200 })))

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
      expect(result.current.selectedCard?.record.valore_pagopa).toBe(100)
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
      expect(result.current.selectedCard?.record.valore_pagopa).toBe(200)
    })
    expect(fetchByIds).toHaveBeenCalledTimes(2)
  })
})
