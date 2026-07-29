/**
 * Pattern B: open chiusura sheet re-fetches when detailRefreshTick bumps
 * (realtime reloadOpenDetail), not on every board columns identity change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, waitFor } from "@testing-library/react"

import { renderHookWithQueryClient } from "@/test/test-utils"

import { useChiusureBoardView } from "../use-chiusure-board-view"
import type { ChiusureBoardCardData, ChiusureBoardColumnData } from "../../types"
import type { ChiusuraContrattoRecord } from "@/types"
import { EMPTY_CHIUSURA_TIPO_METADATA } from "../../lib/chiusure-board"

const boardState = vi.hoisted(() => ({
  detailRefreshTick: 0,
  columns: [] as ChiusureBoardColumnData[],
  updateCard: vi.fn(),
}))

vi.mock("../use-chiusure-board", () => ({
  useChiusureBoard: () => ({
    loading: false,
    error: null,
    columns: boardState.columns,
    rapportoOptions: [],
    tipoLicenziamentoOptions: [],
    tipoMetadata: EMPTY_CHIUSURA_TIPO_METADATA,
    createChiusura: vi.fn(),
    linkRapporto: vi.fn(),
    moveCard: vi.fn(),
    updateCard: boardState.updateCard,
    patchChiusura: vi.fn(),
    deleteChiusura: vi.fn(),
    detailRefreshTick: boardState.detailRefreshTick,
  }),
}))

vi.mock("../../queries/fetch-chiusure-by-ids", () => ({
  fetchChiusureByIds: vi.fn(),
}))

vi.mock("@/modules/rapporti/queries", () => ({
  fetchRapportiLavorativiByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [] }),
}))

vi.mock("@/modules/rapporti/lib", () => ({
  enrichRapportoWithRicercaId: vi.fn(async (rapporto: unknown) => rapporto),
}))

import { fetchChiusureByIds } from "../../queries/fetch-chiusure-by-ids"

const fetchByIds = vi.mocked(fetchChiusureByIds)

function makeRecord(
  overrides: Partial<ChiusuraContrattoRecord> = {},
): ChiusuraContrattoRecord {
  return {
    id: "chi-1",
    allegato_compilato: null,
    check_8_giorni_di_lavoro_svolti: null,
    check_chiusura_istantanea: null,
    cognome: "Rossi",
    data_creazione: null,
    data_fine_rapporto: "2026-04-01",
    data_per_riattivazione: null,
    documenti_chiusura_rapporto: null,
    email: "test@example.com",
    informazioni_aggiuntive: null,
    motivazione_cessazione_rapporto: "v1",
    motivazione_lost: null,
    nome: "Mario",
    presenze_ultimo_mese: null,
    stato: "Chiusura elaborata",
    stato_riattivazione_famiglia: null,
    sconto_proposto_riattivazione: null,
    ticket_id: null,
    tipo_decesso: null,
    tipo_licenziamento: "Licenziamento",
    airtable_id: null,
    airtable_record_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

function makeCard(
  overrides: Partial<ChiusureBoardCardData> = {},
): ChiusureBoardCardData {
  const record = overrides.record ?? makeRecord()
  return {
    id: "chi-1",
    stage: "Chiusura elaborata",
    record,
    rapporto: null,
    nomeCompleto: "Mario Rossi",
    email: "test@example.com",
    motivazione: record.motivazione_cessazione_rapporto,
    dataFineRapporto: "01/04/2026",
    tipoLabel: "Licenziamento",
    tipoColor: "red",
    hasAssunzioneDatore: false,
    hasAssunzioneLavoratore: false,
    ...overrides,
  }
}

describe("useChiusureBoardView — Pattern B detailRefreshTick", () => {
  beforeEach(() => {
    fetchByIds.mockReset()
    boardState.updateCard.mockReset()
    boardState.detailRefreshTick = 0
    boardState.columns = [
      {
        id: "Chiusura elaborata",
        label: "Chiusura elaborata",
        color: "#ccc",
        cards: [makeCard({ record: makeRecord({ motivazione_cessazione_rapporto: "board" }) })],
      },
    ]
  })

  it("re-fetches the open sheet when detailRefreshTick increments", async () => {
    fetchByIds
      .mockResolvedValueOnce({
        rows: [makeRecord({ motivazione_cessazione_rapporto: "remote-1" })],
        total: 1,
        columns: [],
        groups: [],
      })
      .mockResolvedValueOnce({
        rows: [makeRecord({ motivazione_cessazione_rapporto: "remote-2" })],
        total: 1,
        columns: [],
        groups: [],
      })

    const { result, rerender } = renderHookWithQueryClient(() => useChiusureBoardView())

    const boardCard = boardState.columns[0]!.cards[0]!
    act(() => {
      result.current.selectCard(boardCard)
    })

    await waitFor(() => {
      expect(result.current.sheetProps.card?.record.motivazione_cessazione_rapporto).toBe(
        "remote-1",
      )
    })
    expect(fetchByIds).toHaveBeenCalledTimes(1)

    // Board columns identity change alone must NOT re-fetch.
    boardState.columns = [
      {
        ...boardState.columns[0]!,
        cards: [
          makeCard({
            record: makeRecord({ motivazione_cessazione_rapporto: "board-refresh" }),
            email: "other@example.com",
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
      expect(result.current.sheetProps.card?.record.motivazione_cessazione_rapporto).toBe(
        "remote-2",
      )
    })
    expect(fetchByIds).toHaveBeenCalledTimes(2)
  })
})
