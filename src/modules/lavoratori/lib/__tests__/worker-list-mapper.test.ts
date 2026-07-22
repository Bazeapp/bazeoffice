import { describe, expect, it } from "vitest"

import { makeWorkerRow } from "../../components/__tests__/gate1-view-test-fixtures"
import {
  buildRelatedSelectionsMap,
  buildWorkerListItem,
  groupAddressesByWorker,
  resolveWorkerAddress,
} from "../worker-list-mapper"

describe("buildWorkerListItem disponibilita tri-state", () => {
  it("returns true when disponibilita token includes disponibile", () => {
    const item = buildWorkerListItem(
      makeWorkerRow({ disponibilita: "Disponibile da subito" }),
      new Map(),
    )
    expect(item.isDisponibile).toBe(true)
  })

  it("returns false when disponibilita token includes non disponibile", () => {
    const item = buildWorkerListItem(
      makeWorkerRow({ disponibilita: "Non disponibile" }),
      new Map(),
    )
    expect(item.isDisponibile).toBe(false)
  })

  it("returns null when disponibilita is empty or unrecognized", () => {
    expect(
      buildWorkerListItem(makeWorkerRow({ disponibilita: "" }), new Map())
        .isDisponibile,
    ).toBeNull()
    expect(
      buildWorkerListItem(makeWorkerRow({ disponibilita: "in valutazione" }), new Map())
        .isDisponibile,
    ).toBeNull()
  })
})

describe("resolveWorkerAddress fallback", () => {
  it("prefers residenza, then domicilio, then first address", () => {
    const byWorker = new Map<string, Record<string, unknown>[]>([
      [
        "worker-1",
        [
          { entita_id: "worker-1", tipo_indirizzo: "altro", via: "Altro" },
          { entita_id: "worker-1", tipo_indirizzo: "domicilio", via: "Dom" },
          { entita_id: "worker-1", tipo_indirizzo: "residenza", via: "Res" },
        ],
      ],
    ])

    expect(resolveWorkerAddress("worker-1", byWorker)).toEqual(
      expect.objectContaining({ via: "Res" }),
    )

    byWorker.set("worker-1", [
      { entita_id: "worker-1", tipo_indirizzo: "altro", via: "Altro" },
      { entita_id: "worker-1", tipo_indirizzo: "domicilio", via: "Dom" },
    ])
    expect(resolveWorkerAddress("worker-1", byWorker)).toEqual(
      expect.objectContaining({ via: "Dom" }),
    )

    byWorker.set("worker-1", [
      { entita_id: "worker-1", tipo_indirizzo: "altro", via: "Altro" },
    ])
    expect(resolveWorkerAddress("worker-1", byWorker)).toEqual(
      expect.objectContaining({ via: "Altro" }),
    )
  })
})

describe("groupAddressesByWorker", () => {
  it("groups rows by entita_id and skips rows without id", () => {
    const grouped = groupAddressesByWorker([
      { entita_id: "w1", via: "A" },
      { entita_id: "w1", via: "B" },
      { entita_id: "w2", via: "C" },
      { via: "orphan" },
    ])

    expect(grouped.get("w1")).toHaveLength(2)
    expect(grouped.get("w2")).toHaveLength(1)
    expect(grouped.size).toBe(2)
  })
})

describe("buildRelatedSelectionsMap dedup", () => {
  it("dedupes selections by processo_matching_id per worker", () => {
    const map = buildRelatedSelectionsMap(
      [
        {
          lavoratore_id: "w1",
          processo_matching_id: "p1",
          stato_selezione: "In corso",
          stato_res: "Attiva",
          famiglia_nome: "Anna",
          famiglia_cognome: "Verdi",
          numero_ricerca_attivata: 12,
        },
        {
          lavoratore_id: "w1",
          processo_matching_id: "p1",
          stato_selezione: "In corso",
          stato_res: "Attiva",
          famiglia_nome: "Anna",
          famiglia_cognome: "Verdi",
          numero_ricerca_attivata: 12,
        },
        {
          lavoratore_id: "w1",
          processo_matching_id: "p2",
          stato_selezione: "Proposta",
          stato_res: "Attiva",
          famiglia_nome: "Luca",
          famiglia_cognome: "Neri",
          numero_ricerca_attivata: 13,
        },
      ],
      new Map(),
      new Map(),
    )

    const related = map.get("w1")
    expect(related?.count).toBe(2)
    expect(related?.details).toHaveLength(2)
    expect(related?.details.map((d) => d.id)).toEqual(["p1", "p2"])
  })
})
