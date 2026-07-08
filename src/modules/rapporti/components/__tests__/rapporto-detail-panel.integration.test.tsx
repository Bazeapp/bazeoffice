import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import { updateRecord } from "@/lib/record-crud"
import type { RapportoLavorativoRecord } from "../../types/rapporto-lavorativo"
import { RapportoDetailPanel } from "../rapporto-detail-panel"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn(),
}))

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rapporto-1",
    accordo_di_lavoro_allegati: null,
    codice_datore_webcolf: 100,
    codice_dipendente_webcolf: 200,
    cognome_nome_datore_proper: null,
    creata: null,
    data_inizio_rapporto: "2026-01-01",
    distribuzione_ore_settimana: null,
    famiglia_id: "fam-1",
    fine_rapporto_lavorativo_id: null,
    id_rapporto: null,
    lavoratore_id: "worker-1",
    nome_lavoratore_per_url: null,
    ore_a_settimana: 20,
    paga_mensile_lorda: null,
    paga_oraria_lorda: 12,
    processi_matching_id: null,
    assunzione_datore_id: null,
    assunzione_lavoratore_id: null,
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
    stato_assunzione: "Attivo",
    stato_rapporto: "Attivo",
    stato_riattivazione: null,
    stato_servizio: null,
    ticket_id: null,
    tipo_contratto: "A",
    tipo_contratto_durata: null,
    tipo_rapporto: "Convivente",
    airtable_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

describe("RapportoDetailPanel — FASE 5 BIS autosave", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateRecord).mockImplementation(async (_table, _id, patch) => ({
      table: "rapporti_lavorativi",
      id: "rapporto-1",
      row: { ...makeRapporto(), ...patch },
    }))
  })

  it("autosaves codice_datore_webcolf via FieldInput and updateRecord", async () => {
    renderWithProviders(
      <RapportoDetailPanel
        rapporto={makeRapporto()}
        processi={[]}
        contributi={[]}
        mesi={[]}
        mesiCalendario={[]}
        pagamenti={[]}
        transazioni={[]}
        presenze={[]}
        variazioni={[]}
        chiusure={[]}
        richiesteAttivazione={[]}
        loadingRelated={false}
        lookupColorsByDomain={new Map()}
      />,
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Modifica caratteristiche del rapporto" }),
      )
    })

    const webcolfField = screen
      .getByText("Cod. rapporto Webcolf")
      .closest("div")
      ?.querySelector("input") as HTMLInputElement
    expect(webcolfField).toBeTruthy()

    await act(async () => {
      fireEvent.change(webcolfField, { target: { value: "321" } })
    })

    await waitFor(
      () => {
        expect(updateRecord).toHaveBeenCalledWith("rapporti_lavorativi", "rapporto-1", {
          codice_datore_webcolf: 321,
        })
      },
      { timeout: 3000 },
    )
  })
})
