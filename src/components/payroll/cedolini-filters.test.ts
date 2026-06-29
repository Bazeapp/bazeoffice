import { describe, expect, it } from "vitest"

import {
  CASO_PARTICOLARE_FILTER_OPTIONS,
  PRESENZE_FILTER_OPTIONS,
  STATO_PAGAMENTO_FILTER_OPTIONS,
  TIPO_UTENTE_FILTER_OPTIONS,
  cardMatchesCedoliniFilters,
  createDefaultCedoliniFilters,
  getCasoParticolareFilterValue,
  getStatoPagamentoFilterValue,
  getTipoUtenteFilterValue,
  toggleCedoliniFilter,
  type CedoliniFilterableCard,
  type CedoliniFilters,
} from "./cedolini-filters"

function makeCard(overrides: Partial<CedoliniFilterableCard> = {}): CedoliniFilterableCard {
  return {
    record: { caso_particolare: null },
    stage: "TODO",
    pagamento: null,
    // di default: ha richiesta_attivazione → Baze pay, NON pagato, presenze regolari
    richiestaAttivazione: { id: "ra-1" },
    presenzeIrregolari: false,
    ...overrides,
  }
}

/** Filtri "tutti flagged" tranne le sostituzioni indicate. */
function filtersWith(overrides: Partial<CedoliniFilters> = {}): CedoliniFilters {
  return { ...createDefaultCedoliniFilters(), ...overrides }
}

describe("createDefaultCedoliniFilters", () => {
  it("seleziona tutte le opzioni di ogni gruppo (tutti flagged)", () => {
    const filters = createDefaultCedoliniFilters()
    expect([...filters.casoParticolare].sort()).toEqual(
      CASO_PARTICOLARE_FILTER_OPTIONS.map((o) => o.value).sort(),
    )
    expect([...filters.statoPagamento].sort()).toEqual(
      STATO_PAGAMENTO_FILTER_OPTIONS.map((o) => o.value).sort(),
    )
    expect([...filters.tipoUtente].sort()).toEqual(
      TIPO_UTENTE_FILTER_OPTIONS.map((o) => o.value).sort(),
    )
    expect([...filters.presenze].sort()).toEqual(
      PRESENZE_FILTER_OPTIONS.map((o) => o.value).sort(),
    )
  })
})

describe("cardMatchesCedoliniFilters — default (tutti flagged)", () => {
  const filters = createDefaultCedoliniFilters()

  it("mostra qualsiasi card con i filtri di default", () => {
    const cards: CedoliniFilterableCard[] = [
      makeCard(),
      makeCard({ record: { caso_particolare: "si" }, presenzeIrregolari: true }),
      makeCard({ stage: "Pagato", richiestaAttivazione: null }),
      makeCard({ record: { caso_particolare: "chiusura rapporto" }, pagamento: { status: "succeeded" } }),
    ]
    for (const card of cards) {
      expect(cardMatchesCedoliniFilters(card, filters)).toBe(true)
    }
  })
})

describe("caso particolare", () => {
  it("normalizza il testo libero nei 3 bucket", () => {
    expect(getCasoParticolareFilterValue(null)).toBe("regolare")
    expect(getCasoParticolareFilterValue("")).toBe("regolare")
    expect(getCasoParticolareFilterValue("no")).toBe("regolare")
    expect(getCasoParticolareFilterValue("qualcosa")).toBe("regolare")
    expect(getCasoParticolareFilterValue("si")).toBe("caso_particolare")
    expect(getCasoParticolareFilterValue("Caso particolare")).toBe("caso_particolare")
    expect(getCasoParticolareFilterValue("chiusura rapporto")).toBe("chiusura")
  })

  it("filtra le card per caso particolare", () => {
    const regolare = makeCard({ record: { caso_particolare: "no" } })
    const particolare = makeCard({ record: { caso_particolare: "si" } })
    const chiusura = makeCard({ record: { caso_particolare: "chiusura rapporto" } })

    const onlyChiusura = filtersWith({ casoParticolare: new Set(["chiusura"]) })
    expect(cardMatchesCedoliniFilters(chiusura, onlyChiusura)).toBe(true)
    expect(cardMatchesCedoliniFilters(regolare, onlyChiusura)).toBe(false)
    expect(cardMatchesCedoliniFilters(particolare, onlyChiusura)).toBe(false)
  })
})

describe("stato pagamento", () => {
  it("considera pagato lo stage Pagato/DONE o pagamento.status=succeeded", () => {
    expect(getStatoPagamentoFilterValue(makeCard({ stage: "Pagato" }))).toBe("pagato")
    expect(getStatoPagamentoFilterValue(makeCard({ stage: "DONE" }))).toBe("pagato")
    expect(
      getStatoPagamentoFilterValue(makeCard({ stage: "TODO", pagamento: { status: "succeeded" } })),
    ).toBe("pagato")
    expect(getStatoPagamentoFilterValue(makeCard({ stage: "TODO" }))).toBe("da_pagare")
  })

  it("EDGE: un abbonamento (nessuna richiesta_attivazione) conta sempre come Pagato", () => {
    const abbonamentoNonPagato = makeCard({ richiestaAttivazione: null, stage: "TODO", pagamento: null })
    expect(getStatoPagamentoFilterValue(abbonamentoNonPagato)).toBe("pagato")

    const soloDaPagare = filtersWith({ statoPagamento: new Set(["da_pagare"]) })
    const soloPagato = filtersWith({ statoPagamento: new Set(["pagato"]) })
    expect(cardMatchesCedoliniFilters(abbonamentoNonPagato, soloDaPagare)).toBe(false)
    expect(cardMatchesCedoliniFilters(abbonamentoNonPagato, soloPagato)).toBe(true)
  })

  it("filtra le card baze pay per stato pagamento", () => {
    const pagata = makeCard({ stage: "Pagato" })
    const daPagare = makeCard({ stage: "TODO" })
    const soloDaPagare = filtersWith({ statoPagamento: new Set(["da_pagare"]) })
    expect(cardMatchesCedoliniFilters(daPagare, soloDaPagare)).toBe(true)
    expect(cardMatchesCedoliniFilters(pagata, soloDaPagare)).toBe(false)
  })
})

describe("tipo utente", () => {
  it("baze pay ⇔ richiesta_attivazione presente; abbonamenti ⇔ assente", () => {
    expect(getTipoUtenteFilterValue(makeCard({ richiestaAttivazione: { id: "x" } }))).toBe("baze_pay")
    expect(getTipoUtenteFilterValue(makeCard({ richiestaAttivazione: null }))).toBe("abbonamenti")
  })

  it("filtra le card per tipo utente", () => {
    const bazePay = makeCard({ richiestaAttivazione: { id: "x" } })
    const abbonamento = makeCard({ richiestaAttivazione: null })
    const soloAbbonamenti = filtersWith({ tipoUtente: new Set(["abbonamenti"]) })
    expect(cardMatchesCedoliniFilters(abbonamento, soloAbbonamenti)).toBe(true)
    expect(cardMatchesCedoliniFilters(bazePay, soloAbbonamenti)).toBe(false)
  })
})

describe("presenze", () => {
  it("filtra regolari vs irregolari", () => {
    const regolari = makeCard({ presenzeIrregolari: false })
    const irregolari = makeCard({ presenzeIrregolari: true })
    const soloIrregolari = filtersWith({ presenze: new Set(["irregolari"]) })
    expect(cardMatchesCedoliniFilters(irregolari, soloIrregolari)).toBe(true)
    expect(cardMatchesCedoliniFilters(regolari, soloIrregolari)).toBe(false)
  })
})

describe("combinazione tra gruppi (AND)", () => {
  it("esclude la card se fallisce anche un solo gruppo", () => {
    // Baze pay, pagata, presenze irregolari, regolare
    const card = makeCard({ stage: "Pagato", presenzeIrregolari: true })
    // passa caso particolare + stato pagamento + tipo utente, ma chiede presenze regolari → escluso
    const filters = filtersWith({ presenze: new Set(["regolari"]) })
    expect(cardMatchesCedoliniFilters(card, filters)).toBe(false)

    // tutti i gruppi coerenti con la card → incluso
    const coerenti = filtersWith({
      statoPagamento: new Set(["pagato"]),
      presenze: new Set(["irregolari"]),
      tipoUtente: new Set(["baze_pay"]),
    })
    expect(cardMatchesCedoliniFilters(card, coerenti)).toBe(true)
  })

  it("un gruppo con Set vuoto nasconde tutte le card (semantica stretta)", () => {
    const card = makeCard()
    const filters = filtersWith({ presenze: new Set<string>() })
    expect(cardMatchesCedoliniFilters(card, filters)).toBe(false)
  })
})

describe("toggleCedoliniFilter", () => {
  it("rimuove un valore presente senza mutare l'oggetto originale", () => {
    const base = createDefaultCedoliniFilters()
    const next = toggleCedoliniFilter(base, "presenze", "irregolari")
    expect(next.presenze.has("irregolari")).toBe(false)
    expect(base.presenze.has("irregolari")).toBe(true) // immutabilità
    expect(next).not.toBe(base)
    expect(next.presenze).not.toBe(base.presenze)
  })

  it("ri-aggiunge un valore assente", () => {
    const base = filtersWith({ presenze: new Set(["regolari"]) })
    const next = toggleCedoliniFilter(base, "presenze", "irregolari")
    expect(next.presenze.has("irregolari")).toBe(true)
  })
})
