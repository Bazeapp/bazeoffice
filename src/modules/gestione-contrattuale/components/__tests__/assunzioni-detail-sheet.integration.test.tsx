import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import type { AssunzioneRecord, AssunzioniBoardCardData } from "../../types"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
} from "@/types"
import { AssunzioniDetailSheet } from "../assunzioni-detail-sheet"
import { updateRecord } from "@/lib/record-crud"
import { fetchLookupValues } from "@/lib/lookup-values"
import { fetchAssunzioniByFormType } from "../../queries/fetch-assunzioni-by-form-type"
import { fetchAssunzioniByIds } from "../../queries/fetch-assunzioni-by-ids"
import { fetchDocumentiLavoratoriByWorker } from "@/modules/lavoratori/queries"

vi.mock("@/lib/lookup-values", () => ({
  fetchLookupValues: vi.fn(),
}))

vi.mock("../../queries/fetch-assunzioni-by-form-type", () => ({
  fetchAssunzioniByFormType: vi.fn(),
}))

vi.mock("../../queries/fetch-assunzioni-by-ids", () => ({
  fetchAssunzioniByIds: vi.fn(),
}))

vi.mock("@/modules/lavoratori/queries", () => ({
  fetchDocumentiLavoratoriByWorker: vi.fn(),
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn(),
  createRecord: vi.fn(),
}))

function makeAssunzione(overrides: Partial<AssunzioneRecord> = {}): AssunzioneRecord {
  return {
    id: "ass-1",
    creato_il: "2025-01-01T00:00:00Z",
    delega_inps_allegati: null,
    civico_se_diverso_residenza: null,
    codice_fiscale_allegati: null,
    comune_se_diverso_residenza: null,
    dati_bancari_lavoratore: null,
    documento_identita_allegati: null,
    documento_identita_numero: "AA123",
    documento_identita_scadenza: null,
    documento_identita_tipo: null,
    famiglia_id: null,
    cittadino_extracomunitario: null,
    info_anagrafiche_cap: "20100",
    info_anagrafiche_cittadidanza: null,
    info_anagrafiche_civico: null,
    info_anagrafiche_codice_fiscale: "RSSMRA80A01F205X",
    info_anagrafiche_cognome: "Rossi",
    info_anagrafiche_data_di_nascita: "1980-01-01",
    info_anagrafiche_email: null,
    info_anagrafiche_indirizzo: "Via Roma",
    info_anagrafiche_localita: null,
    info_anagrafiche_luogo_di_nascita: "Milano",
    info_anagrafiche_nome: "Mario",
    info_anagrafiche_numero_fisso: null,
    info_anagrafiche_numero_mobile: null,
    luogo_lavoro_se_diverso_da_residenza: null,
    mansione_lavoratore: null,
    mezza_giornata_di_riposo: null,
    ore_di_lavoro: null,
    ore_giovedi: null,
    ore_lunedi: null,
    ore_martedi: null,
    ore_mercoledi: null,
    ore_sabato: null,
    ore_venerdi: null,
    provincia: null,
    permesso_di_soggiorno_allegati: null,
    rapporto_di_lavoro_residenza: null,
    lavoratore_id: null,
    regime_convivenza: null,
    ricevuta_rinnovo_permesso_allegati: null,
    telecamere_posto_lavoro: null,
    tredicesima_rateizzata_mensile: null,
    note_aggiuntive: null,
    data_assunzione: null,
    type_of_compilazione_form: null,
    ...overrides,
  }
}

function makeCard(overrides: Partial<AssunzioniBoardCardData> = {}): AssunzioniBoardCardData {
  return {
    id: "rap-1",
    processId: "proc-1",
    stage: "Avviare pratica",
    process: { id: "proc-1", famiglia_id: "fam-1" } as ProcessoMatchingRecord,
    assunzione: makeAssunzione(),
    lavoratoreAssunzione: makeAssunzione({
      id: "ass-lav",
      info_anagrafiche_nome: "Anna",
      info_anagrafiche_cognome: "Bianchi",
    }),
    richiestaAttivazione: {
      id: "ra-1",
      fee_concordata: 100,
    } as RichiestaAttivazioneRecord,
    rapporto: {
      id: "rap-1",
      stato_assunzione: "Avviare pratica",
      tipo_rapporto: "Convivente",
      tipo_contratto: "A",
      id_rapporto: "",
      data_inizio_rapporto: "2026-03-01",
    } as RapportoLavorativoRecord,
    lavoratore: {
      id: "lav-1",
      nome: "Anna",
      cognome: "Bianchi",
      email: "anna@example.com",
      telefono: "333",
    } as LavoratoreRecord,
    famiglia: {
      id: "fam-1",
      nome: "Mario",
      cognome: "Rossi",
      email: "mario@example.com",
      telefono: "111",
    } as FamigliaRecord,
    famigliaId: "fam-1",
    nomeFamiglia: "Mario Rossi",
    nomeLavoratore: "Anna Bianchi",
    email: "mario@example.com",
    telefono: "111",
    titoloAnnuncio: "Annuncio",
    tipoRapporto: "Convivente",
    deadline: "01/03/2026",
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchLookupValues).mockResolvedValue({ rows: [], total: 0, columns: [] })
  vi.mocked(fetchAssunzioniByFormType).mockResolvedValue({ rows: [], total: 0, columns: [] })
  vi.mocked(fetchAssunzioniByIds).mockResolvedValue({ rows: [], total: 0, columns: [] })
  vi.mocked(fetchDocumentiLavoratoriByWorker).mockResolvedValue({ rows: [], total: 0, columns: [] })
  vi.mocked(updateRecord).mockImplementation(async (_table, _id, patch) => ({
    row: patch,
  }))
})

describe("AssunzioniDetailSheet", () => {
  it("renders the selected assunzione in the open sheet", async () => {
    const card = makeCard()

    renderWithProviders(
      <AssunzioniDetailSheet
        card={card}
        open
        onCardChange={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    expect(
      await screen.findByRole("heading", { name: "Mario Rossi - Anna Bianchi" }),
    ).toBeTruthy()
    expect(screen.getByText("Riepilogo datore")).toBeTruthy()
  })

  it("switches between datore and lavoratore detail tabs", async () => {
    const card = makeCard()

    renderWithProviders(
      <AssunzioniDetailSheet
        card={card}
        open
        onCardChange={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    await screen.findByText("Riepilogo datore")

    fireEvent.click(screen.getByLabelText("Seleziona lavoratore collegato"))

    await waitFor(() => {
      expect(screen.getByText("Riepilogo lavoratore")).toBeTruthy()
      expect(screen.queryByText("Riepilogo datore")).toBeNull()
    })
  })

  it("autosaves practice context fields via updateRecord", async () => {
    const user = userEvent.setup()
    const card = makeCard()

    renderWithProviders(
      <AssunzioniDetailSheet
        card={card}
        open
        onCardChange={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    await screen.findByText("Contesto pratica")

    const idRapportoInput = screen
      .getByText("ID rapporto INPS")
      .closest("div")
      ?.querySelector("input") as HTMLInputElement
    expect(idRapportoInput).toBeTruthy()

    await user.clear(idRapportoInput)
    await user.type(idRapportoInput, "INPS-99")

    await waitFor(
      () => {
        expect(updateRecord).toHaveBeenCalledWith(
          "rapporti_lavorativi",
          "rap-1",
          expect.objectContaining({ id_rapporto: "INPS-99" }),
        )
      },
      { timeout: 3000 },
    )
  })
})
