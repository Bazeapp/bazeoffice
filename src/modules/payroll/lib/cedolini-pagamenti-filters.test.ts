import { describe, expect, it } from "vitest"

import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import type { CedolinoBulkJobDryRunOutcome } from "../types/cedolino-bulk-job"
import {
  filterPagamentiCardsByDate,
  getPagamentiCandidateCards,
  getPagamentiReminderBulkIds,
  isDataInvioFamigliaWithinDateFilter,
  isReminderDryRunSuccess,
  splitPagamentiCardsByReminderStatus,
} from "./cedolini-pagamenti-filters"

function makeCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Inviato cedolino",
    record: {
      id: "m-1",
      caso_particolare: null,
      cedolino: null,
      cedolino_corretto: null,
      cedolino_url: null,
      check_reminder_pagamento_inviato: null,
      data_invio_famiglia: null,
      data_ora_creazione: null,
      importo_busta_estratto: null,
      importo_sconto_mese: null,
      mese_id: null,
      note: null,
      presenze_id: null,
      presenze_regolare_id: null,
      rapporto_lavorativo_id: null,
      rating_feedback_famiglia: null,
      stato_mese_lavorativo: "Inviato cedolino",
      testo_feedback_famiglia: null,
      ticket_id: null,
      ultimo_invio_calendario_presenze: null,
      airtable_id: null,
      creato_il: null,
      aggiornato_il: null,
      metadati_migrazione: null,
    },
    famiglia: null,
    pagamento: null,
    transazione: { id: "t-1", mese_lavorativo_id: "m-1" } as PayrollBoardCardData["transazione"],
    presenze: null,
    presenzeRegolari: null,
    rapporto: null,
    mese: null,
    richiestaAttivazione: null,
    presenzeIrregolari: false,
    nomeCompleto: "Rossi – Maria",
    importoLabel: null,
    dataInvioLabel: null,
    ...overrides,
  }
}

function makeColumns(cards: PayrollBoardCardData[]): PayrollBoardColumnData[] {
  const byStage = new Map<string, PayrollBoardCardData[]>()
  for (const card of cards) {
    byStage.set(card.stage, [...(byStage.get(card.stage) ?? []), card])
  }
  return Array.from(byStage.entries()).map(([id, stageCards]) => ({
    id,
    label: id,
    color: "green",
    cards: stageCards,
  }))
}

describe("getPagamentiCandidateCards (R7)", () => {
  it("include le card 'Inviato cedolino' con una transazione collegata", () => {
    const columns = makeColumns([makeCard({ id: "m-1" })])
    expect(getPagamentiCandidateCards(columns).map((c) => c.id)).toEqual(["m-1"])
  })

  it("EDGE: esclude una card 'Inviato cedolino' senza transazione collegata", () => {
    const columns = makeColumns([makeCard({ id: "m-1", transazione: null })])
    expect(getPagamentiCandidateCards(columns)).toEqual([])
  })

  it("EDGE: esclude le card di altri stage anche con transazione", () => {
    const columns = makeColumns([makeCard({ id: "m-1", stage: "Cedolino Pronto" })])
    expect(getPagamentiCandidateCards(columns)).toEqual([])
  })
})

describe("splitPagamentiCardsByReminderStatus", () => {
  it("check_reminder_pagamento_inviato true → fatti", () => {
    const cards = [makeCard({ id: "m-1" })]
    const flags = new Map([["m-1", true]])
    const { daFare, fatti } = splitPagamentiCardsByReminderStatus(cards, flags)
    expect(daFare).toEqual([])
    expect(fatti.map((c) => c.id)).toEqual(["m-1"])
  })

  it("check_reminder_pagamento_inviato false → da fare", () => {
    const cards = [makeCard({ id: "m-1" })]
    const flags = new Map([["m-1", false]])
    const { daFare, fatti } = splitPagamentiCardsByReminderStatus(cards, flags)
    expect(daFare.map((c) => c.id)).toEqual(["m-1"])
    expect(fatti).toEqual([])
  })

  it("EDGE: flag assente dalla mappa (non ancora caricato) → da fare per sicurezza", () => {
    const cards = [makeCard({ id: "m-1" })]
    const { daFare, fatti } = splitPagamentiCardsByReminderStatus(cards, new Map())
    expect(daFare.map((c) => c.id)).toEqual(["m-1"])
    expect(fatti).toEqual([])
  })
})

describe("isDataInvioFamigliaWithinDateFilter (OQ6)", () => {
  it("nessun filtro → sempre incluso", () => {
    expect(isDataInvioFamigliaWithinDateFilter(null, null)).toBe(true)
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-01", null)).toBe(true)
  })

  it("data_invio_famiglia <= filtro → incluso", () => {
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-01", "2026-07-15")).toBe(true)
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-15", "2026-07-15")).toBe(true)
  })

  it("data_invio_famiglia > filtro → escluso", () => {
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-20", "2026-07-15")).toBe(false)
  })

  it("EDGE (OQ6): data_invio_famiglia NULL con filtro impostato → escluso", () => {
    expect(isDataInvioFamigliaWithinDateFilter(null, "2026-07-15")).toBe(false)
  })

  it("gestisce timestamp ISO con ora confrontando solo la parte data", () => {
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-15T22:00:00.000Z", "2026-07-15")).toBe(true)
    expect(isDataInvioFamigliaWithinDateFilter("2026-07-16T00:00:00.000Z", "2026-07-15")).toBe(false)
  })
})

describe("filterPagamentiCardsByDate (AE6/OQ6)", () => {
  it("senza filtro restituisce tutte le card visibili (bulk = tutte le 'da fare')", () => {
    const cards = [
      makeCard({ id: "m-1", record: { ...makeCard().record, data_invio_famiglia: "2026-07-01" } }),
      makeCard({ id: "m-2", record: { ...makeCard().record, data_invio_famiglia: null } }),
    ]
    expect(filterPagamentiCardsByDate(cards, null).map((c) => c.id)).toEqual(["m-1", "m-2"])
  })

  it("con filtro esclude le date successive e i NULL (AE6/OQ6)", () => {
    const cards = [
      makeCard({ id: "m-1", record: { ...makeCard().record, data_invio_famiglia: "2026-07-01" } }),
      makeCard({ id: "m-2", record: { ...makeCard().record, data_invio_famiglia: "2026-07-20" } }),
      makeCard({ id: "m-3", record: { ...makeCard().record, data_invio_famiglia: null } }),
    ]
    expect(filterPagamentiCardsByDate(cards, "2026-07-15").map((c) => c.id)).toEqual(["m-1"])
  })
})

describe("getPagamentiReminderBulkIds (AE6)", () => {
  it("mappa le card visibili ai loro mese_lavorativo_id", () => {
    const cards = [makeCard({ id: "m-1" }), makeCard({ id: "m-2" })]
    expect(getPagamentiReminderBulkIds(cards)).toEqual(["m-1", "m-2"])
  })

  it("EDGE: nessuna card visibile → nessun id", () => {
    expect(getPagamentiReminderBulkIds([])).toEqual([])
  })
})

describe("isReminderDryRunSuccess", () => {
  it("status success → successo", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = { mese_lavorativo_id: "m-1", status: "success", details: {} }
    expect(isReminderDryRunSuccess(outcome)).toBe(true)
  })

  it("EDGE: status skipped (già inviato) → fallimento del dry run", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = {
      mese_lavorativo_id: "m-1",
      status: "skipped",
      error: "already_sent",
    }
    expect(isReminderDryRunSuccess(outcome)).toBe(false)
  })

  it("EDGE: status error → fallimento", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = { mese_lavorativo_id: "m-1", status: "error", error: "boom" }
    expect(isReminderDryRunSuccess(outcome)).toBe(false)
  })

  it("EDGE: nessun outcome → fallimento", () => {
    expect(isReminderDryRunSuccess(null)).toBe(false)
  })
})
