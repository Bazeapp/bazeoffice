import { describe, expect, it } from "vitest"

import {
  applyProcessPatchToCard,
  loadRicercaDetailCard,
} from "./ricerca-detail-view.mappers"
import type { RicercaDetailCardData } from "./ricerca-detail-view.types"
import { displayValue } from "./ricerca-detail-view.utils"

function makeCard(
  overrides: Partial<RicercaDetailCardData> = {},
): RicercaDetailCardData {
  return {
    id: "proc-1",
    famigliaId: "fam-1",
    nomeFamiglia: "Rossi",
    statoRes: "in_corso",
    ...overrides,
  } as RicercaDetailCardData
}

describe("applyProcessPatchToCard", () => {
  it("updates stato_res on the card", () => {
    const card = makeCard({ statoRes: "vecchio" })
    const next = applyProcessPatchToCard(card, { stato_res: "no_match" })
    expect(next.statoRes).toBe(displayValue("no_match"))
  })

  it("updates boolean flags", () => {
    const card = makeCard({ richiestaPatente: false })
    const next = applyProcessPatchToCard(card, { richiesta_patente: true })
    expect(next.richiestaPatente).toBe(true)
  })
})

describe("loadRicercaDetailCard", () => {
  it("is exported as an async loader", () => {
    expect(typeof loadRicercaDetailCard).toBe("function")
  })
})
