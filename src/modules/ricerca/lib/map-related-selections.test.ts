import { describe, expect, it } from "vitest"

import { excludeCurrentProcess } from "./map-related-selections"

const CURRENT = "proc-current"

function row(processo_matching_id: unknown, extra: Record<string, unknown> = {}) {
  return { processo_matching_id, ...extra }
}

describe("excludeCurrentProcess", () => {
  it("esclude le righe del processo corrente, tiene le altre", () => {
    const rows = [
      row(CURRENT, { stato_selezione: "Prospetto" }),
      row("proc-a", { stato_selezione: "Da colloquiare" }),
      row("proc-b", { stato_selezione: "Selezionato" }),
    ]
    const kept = excludeCurrentProcess(rows, CURRENT)
    expect(kept.map((r) => r.processo_matching_id)).toEqual(["proc-a", "proc-b"])
  })

  it("se tutte le righe sono del processo corrente → []", () => {
    const rows = [row(CURRENT), row(CURRENT)]
    expect(excludeCurrentProcess(rows, CURRENT)).toEqual([])
  })

  it("input vuoto → []", () => {
    expect(excludeCurrentProcess([], CURRENT)).toEqual([])
  })

  it("righe con processo_matching_id null/undefined sono tenute (non sono la corrente)", () => {
    const rows = [row(null), row(undefined), row(CURRENT)]
    expect(excludeCurrentProcess(rows, CURRENT)).toHaveLength(2)
  })
})
