import { describe, expect, it } from "vitest"

import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import type { CedolinoCheckResultRecord, CedolinoCheckRunRecord } from "../types/cedolino-check"
import {
  buildCedolinoCheckCards,
  buildMeseLavoratoInfoMap,
  createDefaultWarningCategoryFilter,
  filterWarningGroups,
  getCardWarningCategories,
  getCheckRunProgressPercent,
  getProntiCards,
  groupWarningsByCategory,
  toggleWarningCategoryFilter,
  type CedolinoCheckCard,
} from "./cedolini-check-warnings"

function makeBoardCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Cedolino da controllare",
    record: { id: "m-1", caso_particolare: "no" } as PayrollBoardCardData["record"],
    famiglia: null,
    pagamento: null,
    transazione: null,
    presenze: null,
    presenzeRegolari: null,
    rapporto: { id: "r-1" } as PayrollBoardCardData["rapporto"],
    mese: null,
    richiestaAttivazione: { id: "ra-1", fee_concordata: null },
    presenzeIrregolari: false,
    nomeCompleto: "Rossi – Maria",
    importoLabel: "€1.000",
    dataInvioLabel: null,
    ...overrides,
  }
}

function makeColumns(cards: PayrollBoardCardData[]): PayrollBoardColumnData[] {
  return [{ id: "Cedolino da controllare", label: "Cedolino da controllare", color: "yellow", cards }]
}

function makeResult(overrides: Partial<CedolinoCheckResultRecord> = {}): CedolinoCheckResultRecord {
  return {
    id: "res-1",
    run_id: "run-1",
    mese_lavorativo_id: "m-1",
    status: "ok",
    warnings: [],
    details: null,
    ...overrides,
  }
}

describe("buildMeseLavoratoInfoMap", () => {
  it("mappa id → {nomeCompleto, tipo, importoLabel, dataInvioLabel} dalle colonne board", () => {
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria", richiestaAttivazione: { id: "ra-1", fee_concordata: null } }),
      makeBoardCard({ id: "m-2", nomeCompleto: "Bianchi – Luca", richiestaAttivazione: null }),
    ])

    const map = buildMeseLavoratoInfoMap(columns)

    expect(map.get("m-1")).toEqual({
      nomeCompleto: "Rossi – Maria",
      tipo: "baze_pay",
      importoLabel: "€1.000",
      dataInvioLabel: null,
    })
    expect(map.get("m-2")?.tipo).toBe("abbonamenti")
    expect(map.get("m-3")).toBeUndefined()
  })
})

describe("getCardWarningCategories", () => {
  function makeCard(overrides: Partial<CedolinoCheckCard> = {}): CedolinoCheckCard {
    return {
      resultId: "res-1",
      meseLavorativoId: "m-1",
      status: "warning",
      warnings: [],
      details: null,
      info: null,
      ...overrides,
    }
  }

  it("estrae le categorie uniche in ordine fisso PRD", () => {
    const card = makeCard({
      warnings: [
        { category: "Altri", message: "x" },
        { category: "Paga oraria", message: "y" },
        { category: "Paga oraria", message: "y2" }, // duplicate category, same card
      ],
    })
    expect(getCardWarningCategories(card)).toEqual(["Paga oraria", "Altri"])
  })

  it("EDGE: card in warning senza categorie riconosciute finisce in Altri", () => {
    const card = makeCard({ status: "warning", warnings: [] })
    expect(getCardWarningCategories(card)).toEqual(["Altri"])
  })

  it("EDGE: card error senza warnings finisce in Altri", () => {
    const card = makeCard({ status: "error", warnings: [] })
    expect(getCardWarningCategories(card)).toEqual(["Altri"])
  })

  it("card ok non ha categorie", () => {
    const card = makeCard({ status: "ok", warnings: [] })
    expect(getCardWarningCategories(card)).toEqual([])
  })
})

describe("groupWarningsByCategory", () => {
  it("EDGE: una card con 2 categorie di warning appare in ENTRAMBI i gruppi", () => {
    const cards: CedolinoCheckCard[] = [
      {
        resultId: "res-1",
        meseLavorativoId: "m-1",
        status: "warning",
        warnings: [
          { category: "Paga oraria", message: "paga diversa" },
          { category: "Ore non coerenti", message: "ore diverse" },
        ],
        details: null,
        info: null,
      },
    ]

    const groups = groupWarningsByCategory(cards)
    const pagaOraria = groups.find((g) => g.category === "Paga oraria")
    const oreNonCoerenti = groups.find((g) => g.category === "Ore non coerenti")

    expect(pagaOraria?.cards.map((c) => c.resultId)).toEqual(["res-1"])
    expect(oreNonCoerenti?.cards.map((c) => c.resultId)).toEqual(["res-1"])
  })

  it("mantiene l'ordine fisso delle 7 categorie PRD, incluse quelle vuote", () => {
    const groups = groupWarningsByCategory([])
    expect(groups.map((g) => g.category)).toEqual([
      "Pagamento Stripe",
      "Ore non coerenti",
      "Eventi presenze",
      "Cedolino o PDF",
      "Paga oraria",
      "Note/casi particolari",
      "Altri",
    ])
    expect(groups.every((g) => g.cards.length === 0)).toBe(true)
  })

  it("ignora le card con status ok/pending/processing", () => {
    const cards: CedolinoCheckCard[] = [
      { resultId: "r-ok", meseLavorativoId: "m-1", status: "ok", warnings: [], details: null, info: null },
      { resultId: "r-pending", meseLavorativoId: "m-2", status: "pending", warnings: [], details: null, info: null },
      { resultId: "r-processing", meseLavorativoId: "m-3", status: "processing", warnings: [], details: null, info: null },
    ]
    const groups = groupWarningsByCategory(cards)
    expect(groups.every((g) => g.cards.length === 0)).toBe(true)
  })
})

describe("getProntiCards", () => {
  it("filtra solo le card con status ok", () => {
    const cards: CedolinoCheckCard[] = [
      { resultId: "r-1", meseLavorativoId: "m-1", status: "ok", warnings: [], details: null, info: null },
      { resultId: "r-2", meseLavorativoId: "m-2", status: "warning", warnings: [], details: null, info: null },
      { resultId: "r-3", meseLavorativoId: "m-3", status: "pending", warnings: [], details: null, info: null },
    ]
    expect(getProntiCards(cards).map((c) => c.resultId)).toEqual(["r-1"])
  })
})

describe("buildCedolinoCheckCards", () => {
  it("combina i risultati con la mappa nomi/tipo dalla board", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria" })])
    const results = [makeResult({ status: "warning", warnings: [{ category: "Altri", message: "boh" }] })]

    const cards = buildCedolinoCheckCards(results, columns)

    expect(cards).toHaveLength(1)
    expect(cards[0].info?.nomeCompleto).toBe("Rossi – Maria")
    expect(cards[0].status).toBe("warning")
  })

  it("EDGE: nessun match nella board → info null, nessun crash", () => {
    const results = [makeResult({ mese_lavorativo_id: "m-missing" })]
    const cards = buildCedolinoCheckCards(results, [])
    expect(cards[0].info).toBeNull()
  })

  it("normalizza warnings/details null a valori sicuri", () => {
    const results = [makeResult({ warnings: null, details: null })]
    const cards = buildCedolinoCheckCards(results, [])
    expect(cards[0].warnings).toEqual([])
    expect(cards[0].details).toBeNull()
  })
})

describe("filtro categorie (chip)", () => {
  it("default: tutte le categorie selezionate", () => {
    const filter = createDefaultWarningCategoryFilter()
    expect(filter.size).toBe(7)
    expect(filter.has("Altri")).toBe(true)
  })

  it("toggle rimuove/riaggiunge senza mutare l'originale", () => {
    const base = createDefaultWarningCategoryFilter()
    const next = toggleWarningCategoryFilter(base, "Altri")
    expect(next.has("Altri")).toBe(false)
    expect(base.has("Altri")).toBe(true)
    const restored = toggleWarningCategoryFilter(next, "Altri")
    expect(restored.has("Altri")).toBe(true)
  })

  it("filterWarningGroups mostra solo le categorie selezionate", () => {
    const cards: CedolinoCheckCard[] = [
      {
        resultId: "r-1",
        meseLavorativoId: "m-1",
        status: "warning",
        warnings: [{ category: "Altri", message: "x" }],
        details: null,
        info: null,
      },
    ]
    const groups = groupWarningsByCategory(cards)
    const filter = new Set<CedolinoCheckCard["warnings"][number]["category"]>(["Paga oraria"])
    const visible = filterWarningGroups(groups, filter)
    expect(visible.map((g) => g.category)).toEqual(["Paga oraria"])
  })
})

describe("getCheckRunProgressPercent", () => {
  function makeRun(overrides: Partial<CedolinoCheckRunRecord> = {}): CedolinoCheckRunRecord {
    return {
      id: "run-1",
      year_month: "2026-07",
      status: "in_corso",
      total_count: 10,
      checked_count: 3,
      started_at: null,
      completed_at: null,
      ...overrides,
    }
  }

  it("calcola la percentuale arrotondata", () => {
    expect(getCheckRunProgressPercent(makeRun({ checked_count: 3, total_count: 10 }))).toBe(30)
  })

  it("EDGE: total_count 0 → 0 (nessuna divisione per zero)", () => {
    expect(getCheckRunProgressPercent(makeRun({ checked_count: 0, total_count: 0 }))).toBe(0)
  })

  it("EDGE: non supera 100", () => {
    expect(getCheckRunProgressPercent(makeRun({ checked_count: 12, total_count: 10 }))).toBe(100)
  })
})
