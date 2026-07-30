/**
 * Pattern B: detail panel must mirror prop content changes for the same id
 * (not only on id switch).
 */
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

import type { RapportoLavorativoRecord } from "@/types"

import { useRapportoDetailPanel } from "../use-rapporto-detail-panel"

vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) },
  },
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn(),
}))

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rapp-1",
    accordo_di_lavoro_allegati: null,
    codice_datore_webcolf: null,
    codice_dipendente_webcolf: null,
    cognome_nome_datore_proper: "Fam",
    creata: null,
    data_inizio_rapporto: null,
    data_fine_rapporto: null,
    dichiarazione_ospitalita_allegati: null,
    distribuzione_ore_settimana: null,
    famiglia_id: null,
    fine_rapporto_lavorativo_id: null,
    id_rapporto: null,
    lavoratore_id: null,
    nome_lavoratore_per_url: "Lav",
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
    prova_note_cs_famiglia: "local",
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

describe("useRapportoDetailPanel — prop content sync", () => {
  it("updates header/detail fields when the same-id rapporto prop changes", () => {
    const { result, rerender } = renderHook(
      ({ rapporto }: { rapporto: RapportoLavorativoRecord }) =>
        useRapportoDetailPanel({
          rapporto,
          famiglia: null,
          lavoratore: null,
          processi: [],
          contributi: [],
          mesi: [],
          mesiCalendario: [],
          pagamenti: [],
          transazioni: [],
          presenze: [],
          variazioni: [],
          chiusure: [],
          loadingRelated: false,
          lookupColorsByDomain: new Map(),
        }),
      {
        initialProps: {
          rapporto: makeRapporto({ codice_datore_webcolf: 111 }),
        },
      },
    )

    expect(result.current.form.getValues("codice_datore_webcolf")).toBe("111")

    act(() => {
      rerender({
        rapporto: makeRapporto({ codice_datore_webcolf: 222 }),
      })
    })

    expect(result.current.form.getValues("codice_datore_webcolf")).toBe("222")
  })
})
