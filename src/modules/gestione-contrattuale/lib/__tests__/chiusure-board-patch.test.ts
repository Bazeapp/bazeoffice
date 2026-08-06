import { describe, expect, it } from "vitest"

import {
  applyChiusuraPatchInColumns,
  resolveChiusuraTipoDisplay,
  type ChiusuraTipoMetadata,
} from "../chiusure-board"
import type { ChiusureBoardCardData, ChiusureBoardColumnData } from "../../types"
import type { ChiusuraContrattoRecord } from "@/types"

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
    motivazione_cessazione_rapporto: "Motivazione",
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
  return {
    id: "chi-1",
    stage: "Chiusura elaborata",
    record: makeRecord(),
    rapporto: null,
    nomeCompleto: "Mario Rossi",
    email: "test@example.com",
    motivazione: "Motivazione",
    dataFineRapporto: "01/04/2026",
    tipoLabel: "Licenziamento",
    tipoColor: "red",
    hasAssunzioneDatore: false,
    hasAssunzioneLavoratore: false,
    ...overrides,
  }
}

const tipoMetadata: ChiusuraTipoMetadata = {
  labels: new Map([
    ["licenziamento", "Licenziamento"],
    ["dimissioni", "Dimissioni"],
    ["decesso", "Decesso"],
  ]),
  colors: new Map([
    ["licenziamento", "red"],
    ["dimissioni", "blue"],
    ["decesso", "gray"],
  ]),
  tipoLicenziamentoOptions: [],
}

describe("resolveChiusuraTipoDisplay", () => {
  it("resolves label and color from tipo_licenziamento", () => {
    expect(
      resolveChiusuraTipoDisplay(
        { tipo_licenziamento: "Dimissioni", tipo_decesso: null },
        tipoMetadata,
      ),
    ).toEqual({ tipoLabel: "Dimissioni", tipoColor: "blue" })
  })

  it("falls back to tipo_decesso when tipo_licenziamento is null", () => {
    expect(
      resolveChiusuraTipoDisplay(
        { tipo_licenziamento: null, tipo_decesso: "Decesso" },
        tipoMetadata,
      ),
    ).toEqual({ tipoLabel: "Decesso", tipoColor: "gray" })
  })
})

describe("applyChiusuraPatchInColumns — tipo badge recompute", () => {
  it("recomputes tipoLabel and tipoColor when tipo_licenziamento changes", () => {
    const columns: ChiusureBoardColumnData[] = [
      {
        id: "Chiusura elaborata",
        label: "Chiusura elaborata",
        color: "#ccc",
        cards: [makeCard()],
      },
    ]

    const next = applyChiusuraPatchInColumns(
      columns,
      "chi-1",
      { tipo_licenziamento: "Dimissioni" },
      tipoMetadata,
    )

    const card = next[0]?.cards[0]
    expect(card?.record.tipo_licenziamento).toBe("Dimissioni")
    expect(card?.tipoLabel).toBe("Dimissioni")
    expect(card?.tipoColor).toBe("blue")
  })

  it("recomputes badge when tipo_decesso changes", () => {
    const columns: ChiusureBoardColumnData[] = [
      {
        id: "Chiusura elaborata",
        label: "Chiusura elaborata",
        color: "#ccc",
        cards: [
          makeCard({
            record: makeRecord({ tipo_licenziamento: null, tipo_decesso: null }),
            tipoLabel: "-",
            tipoColor: null,
          }),
        ],
      },
    ]

    const next = applyChiusuraPatchInColumns(
      columns,
      "chi-1",
      { tipo_decesso: "Decesso" },
      tipoMetadata,
    )

    const card = next[0]?.cards[0]
    expect(card?.tipoLabel).toBe("Decesso")
    expect(card?.tipoColor).toBe("gray")
  })

  it("leaves badge unchanged when patch does not touch tipo fields", () => {
    const columns: ChiusureBoardColumnData[] = [
      {
        id: "Chiusura elaborata",
        label: "Chiusura elaborata",
        color: "#ccc",
        cards: [makeCard({ tipoLabel: "Licenziamento", tipoColor: "red" })],
      },
    ]

    const next = applyChiusuraPatchInColumns(
      columns,
      "chi-1",
      { motivazione_cessazione_rapporto: "Nuova" },
      tipoMetadata,
    )

    const card = next[0]?.cards[0]
    expect(card?.motivazione).toBe("Nuova")
    expect(card?.tipoLabel).toBe("Licenziamento")
    expect(card?.tipoColor).toBe("red")
  })
})
