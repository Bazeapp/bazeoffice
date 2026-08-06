/**
 * Pattern B: open rapporto detail re-fetches when reloadOpenDetail bumps
 * realtimeTick — not on board-only reload / cards identity churn.
 */
import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import type { RapportoLavorativoRecord } from "@/types"

import { useRapportiLavorativiData } from "../use-rapporti-lavorativi-data"

const {
  mockFetchRapportiLavorativiBoard,
  mockFetchRapportiLavorativiByIds,
  mockFetchAssunzioniNamesByRapportoIds,
  mockFetchLookupValues,
  mockUseRealtimeBoardSync,
  realtimeCallbacks,
} = vi.hoisted(() => {
  const realtimeCallbacks: {
    reload?: () => void
    reloadOpenDetail?: () => void
  } = {}
  return {
    mockFetchRapportiLavorativiBoard: vi.fn(),
    mockFetchRapportiLavorativiByIds: vi.fn(),
    mockFetchAssunzioniNamesByRapportoIds: vi.fn(),
    mockFetchLookupValues: vi.fn(),
    mockUseRealtimeBoardSync: vi.fn(
      (options: { reload: () => void; reloadOpenDetail?: () => void }) => {
        realtimeCallbacks.reload = options.reload
        realtimeCallbacks.reloadOpenDetail = options.reloadOpenDetail
      },
    ),
    realtimeCallbacks,
  }
})

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: (options: {
    reload: () => void
    reloadOpenDetail?: () => void
  }) => mockUseRealtimeBoardSync(options),
}))

vi.mock("../../queries/fetch-rapporti-lavorativi-board", () => ({
  fetchRapportiLavorativiBoard: (...args: unknown[]) =>
    mockFetchRapportiLavorativiBoard(...args),
}))

vi.mock("../../queries/fetch-rapporti-lavorativi-by-ids", () => ({
  fetchRapportiLavorativiByIds: (...args: unknown[]) =>
    mockFetchRapportiLavorativiByIds(...args),
}))

vi.mock("@/modules/gestione-contrattuale/queries", () => ({
  fetchAssunzioniNamesByRapportoIds: (...args: unknown[]) =>
    mockFetchAssunzioniNamesByRapportoIds(...args),
  fetchChiusureByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchVariazioniByRapporto: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

vi.mock("@/lib/lookup-values", () => ({
  fetchLookupValues: (...args: unknown[]) => mockFetchLookupValues(...args),
}))

vi.mock("@/modules/ricerca/queries", () => ({
  fetchProcessiMatchingByIds: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

vi.mock("@/modules/lavoratori/queries", () => ({
  fetchLavoratoriByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

vi.mock("@/modules/lavoratori/lib/lavoratore-name-lookup", () => ({
  fetchUniqueLavoratoreByDisplayName: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/modules/crm/queries", () => ({
  fetchFamiglieByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchRichiesteAttivazioneByProcessIds: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

vi.mock("@/modules/crm/lib/famiglia-name-lookup", () => ({
  fetchUniqueFamigliaByDisplayName: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/modules/payroll/queries", () => ({
  fetchContributiInpsByRapporto: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchMesiCalendarioByIds: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchMesiLavoratiByRapporto: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchPagamentiByTransazioneIds: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchPresenzeByIds: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
  fetchTransazioniByMeseLavoratoIds: vi
    .fn()
    .mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

vi.mock("../queries/fetch-ticket-by-rapporto", () => ({
  fetchTicketByRapporto: vi.fn().mockResolvedValue({ rows: [], total: 0, columns: [], groups: [] }),
}))

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rapp-1",
    accordo_di_lavoro_allegati: null,
    codice_datore_webcolf: null,
    codice_dipendente_webcolf: null,
    cognome_nome_datore_proper: "Famiglia Test",
    creata: null,
    data_inizio_rapporto: null,
    data_fine_rapporto: null,
    dichiarazione_ospitalita_allegati: null,
    distribuzione_ore_settimana: null,
    famiglia_id: "fam-1",
    fine_rapporto_lavorativo_id: null,
    id_rapporto: "id-rapp-1",
    lavoratore_id: "lav-1",
    nome_lavoratore_per_url: "Lavoratore Test",
    ore_a_settimana: null,
    paga_mensile_lorda: null,
    paga_oraria_lorda: null,
    processi_matching_id: null,
    assunzione_datore_id: null,
    assunzione_lavoratore_id: null,
    processo_res: null,
    prova_data_checkin: null,
    prova_feedback_famiglia: null,
    prova_feedback_lavoratore: null,
    prova_note_cs_famiglia: null,
    prova_note_cs_lavoratore: null,
    prova_priorita_famiglia: null,
    prova_ramo_d2: null,
    prova_stato_cs: null,
    registrazione_chiamate_famiglia: null,
    registrazione_chiamate_lavoratori: null,
    relazione_lavorativa: null,
    ricevuta_inps_allegati: null,
    richiesta_attivazione_id: null,
    stato_assunzione: null,
    stato_rapporto: "Attivo",
    stato_riattivazione: null,
    stato_servizio: null,
    ticket_id: null,
    tipo_contratto: null,
    tipo_contratto_durata: null,
    tipo_rapporto: null,
    airtable_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

function tableResponse(row: RapportoLavorativoRecord) {
  return {
    rows: [row],
    total: 1,
    columns: [],
    groups: [],
  }
}

describe("useRapportiLavorativiData — Pattern B realtimeTick", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtimeCallbacks.reload = undefined
    realtimeCallbacks.reloadOpenDetail = undefined
    mockFetchLookupValues.mockResolvedValue({ rows: [] })
    mockFetchAssunzioniNamesByRapportoIds.mockResolvedValue({})
    mockFetchRapportiLavorativiBoard.mockResolvedValue(
      tableResponse(makeRapporto({ prova_note_cs_famiglia: "board" })),
    )
  })

  it("re-fetches open detail when reloadOpenDetail bumps realtimeTick", async () => {
    mockFetchRapportiLavorativiByIds
      .mockResolvedValueOnce(
        tableResponse(makeRapporto({ prova_note_cs_famiglia: "remote-1" })),
      )
      .mockResolvedValueOnce(
        tableResponse(makeRapporto({ prova_note_cs_famiglia: "remote-2" })),
      )

    const { result } = renderHookWithQueryClient(() =>
      useRapportiLavorativiData({ initialSelectedRapportoId: "rapp-1" }),
    )

    await waitFor(() => {
      expect(result.current.selectedRapporto?.prova_note_cs_famiglia).toBe("remote-1")
    })
    expect(mockFetchRapportiLavorativiByIds).toHaveBeenCalledTimes(1)
    expect(realtimeCallbacks.reloadOpenDetail).toEqual(expect.any(Function))

    // Board-only reload must not re-fetch the open detail.
    const boardCallsBefore = mockFetchRapportiLavorativiBoard.mock.calls.length
    await act(async () => {
      realtimeCallbacks.reload?.()
    })
    await waitFor(() => {
      expect(mockFetchRapportiLavorativiBoard.mock.calls.length).toBeGreaterThan(
        boardCallsBefore,
      )
    })
    expect(mockFetchRapportiLavorativiByIds).toHaveBeenCalledTimes(1)

    await act(async () => {
      realtimeCallbacks.reloadOpenDetail?.()
    })

    await waitFor(() => {
      expect(result.current.selectedRapporto?.prova_note_cs_famiglia).toBe("remote-2")
    })
    expect(mockFetchRapportiLavorativiByIds).toHaveBeenCalledTimes(2)
  })
})
