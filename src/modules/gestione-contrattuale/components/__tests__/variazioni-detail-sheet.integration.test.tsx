import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import { updateRecord } from "@/lib/record-crud"
import type { RapportoLavorativoRecord } from "@/types"
import type { VariazioneContrattualeRecord } from "../../types/variazione-contrattuale"
import type { VariazioniBoardCardData } from "../../types/variazioni-board"
import { VariazioniDetailSheet } from "../variazioni-detail-sheet"

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

function makeVariazioniCard(
  overrides: Partial<VariazioniBoardCardData> = {},
): VariazioniBoardCardData {
  const record: VariazioneContrattualeRecord = {
    id: "var-1",
    accordo_variazione_contrattuale: null,
    data_variazione: "2026-03-01",
    rapporto_lavorativo_id: "rapporto-1",
    ricevuta_inps_variazione_rapporto: null,
    stato: "da_gestire",
    ticket_id: null,
    variazione_da_applicare: "Aumento ore",
    airtable_id: null,
    airtable_record_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
  }
  const rapporto = {
    id: "rapporto-1",
    tipo_rapporto: "Convivente",
    tipo_contratto: "A",
    paga_oraria_lorda: 10,
    ore_a_settimana: 20,
    distribuzione_ore_settimana: "Lun-Ven",
  } as RapportoLavorativoRecord

  return {
    id: "var-1",
    stage: "da_gestire",
    record,
    rapporto,
    famiglia: { id: "fam-1", nome: "Mario", cognome: "Rossi" },
    lavoratore: { id: "worker-1", nome: "Anna", cognome: "Bianchi" },
    nomeCompleto: "Mario Rossi - Anna Bianchi",
    dataVariazione: "01/03/2026",
    variazioneDaApplicare: "Aumento ore",
    ...overrides,
  }
}

describe("VariazioniDetailSheet — FASE 5 BIS autosave", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateRecord).mockImplementation(async (_table, _id, patch) => ({
      table: "variazioni_contrattuali",
      id: "var-1",
      row: { ...makeVariazioniCard().record, ...patch },
    }))
  })

  it("autosaves variazione_da_applicare via FieldTextarea and updateRecord", async () => {
    const onCardChange = vi.fn()

    renderWithProviders(
      <VariazioniDetailSheet
        card={makeVariazioniCard()}
        open
        onOpenChange={vi.fn()}
        onCardChange={onCardChange}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli variazione" }))
    })

    const textarea = screen
      .getByText("Variazione da applicare")
      .closest("label")
      ?.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea).toBeTruthy()

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Nuova distribuzione ore" } })
    })

    await waitFor(
      () => {
        expect(updateRecord).toHaveBeenCalledWith("variazioni_contrattuali", "var-1", {
          variazione_da_applicare: "Nuova distribuzione ore",
        })
      },
      { timeout: 3000 },
    )
  })
})
