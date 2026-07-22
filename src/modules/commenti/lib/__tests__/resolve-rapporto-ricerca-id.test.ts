import { describe, expect, it } from "vitest"

import { resolveRapportoRicercaId } from "../resolve-rapporto-ricerca-id"

const RICERCA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const FALLBACK = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

describe("resolveRapportoRicercaId", () => {
  it("prefers processi_matching_id on the rapporto", () => {
    expect(
      resolveRapportoRicercaId(
        { processi_matching_id: RICERCA, processo_res: [FALLBACK] },
        FALLBACK,
      ),
    ).toBe(RICERCA)
  })

  it("falls back to processo_res then explicit processId", () => {
    expect(
      resolveRapportoRicercaId({ processi_matching_id: null, processo_res: [FALLBACK] }),
    ).toBe(FALLBACK)
    expect(resolveRapportoRicercaId({ processi_matching_id: null }, FALLBACK)).toBe(FALLBACK)
  })

  it("returns null when nothing is linked", () => {
    expect(resolveRapportoRicercaId({ processi_matching_id: null })).toBeNull()
    expect(resolveRapportoRicercaId(null)).toBeNull()
  })
})
