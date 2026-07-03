import { describe, expect, it } from "vitest"

import { resolveDeepLinkSelection } from "./deep-link-selection"
import type {
  AssunzioniBoardCardData,
  AssunzioniBoardColumnData,
} from "../../types"

const card = (id: string) => ({ id }) as AssunzioniBoardCardData

const col = (
  over: Partial<AssunzioniBoardColumnData> = {},
): AssunzioniBoardColumnData =>
  ({
    id: "stage",
    label: "Stage",
    color: "sky",
    cards: [],
    deferred: false,
    loaded: true,
    loadError: null,
    loading: false,
    ...over,
  }) as AssunzioniBoardColumnData

describe("resolveDeepLinkSelection (BAZ-20)", () => {
  it("selects the card whose id matches the target rapporto id", () => {
    const columns = [
      col({ id: "A", cards: [card("R0"), card("R1")] }),
      col({ id: "B", cards: [card("R2")] }),
    ]
    const action = resolveDeepLinkSelection(columns, "R1")
    expect(action.type).toBe("select")
    expect(action).toMatchObject({ card: { id: "R1" } })
  })

  it("reports not-found when the id is absent and no deferred columns remain", () => {
    const columns = [col({ id: "A", cards: [card("R0")] })]
    expect(resolveDeepLinkSelection(columns, "MISSING")).toEqual({
      type: "not-found",
    })
  })

  it("asks to load deferred columns before concluding not-found", () => {
    const columns = [
      col({ id: "Avviare pratica", cards: [card("R0")] }),
      col({ id: "Contratto firmato", deferred: true, loaded: false, cards: [] }),
    ]
    expect(resolveDeepLinkSelection(columns, "R9")).toEqual({
      type: "load-deferred",
      stageIds: ["Contratto firmato"],
    })
  })

  it("reports load-error when a deferred column failed and nothing else can load", () => {
    const columns = [
      col({ id: "A", cards: [card("R0")] }),
      col({
        id: "Contratto firmato",
        deferred: true,
        loaded: false,
        loading: false,
        loadError: "boom",
        cards: [],
      }),
    ]
    expect(resolveDeepLinkSelection(columns, "R9")).toEqual({ type: "load-error" })
  })

  it("still loads other deferred columns before surfacing a load-error", () => {
    const columns = [
      col({ id: "Non assume con Baze", deferred: true, loaded: false, cards: [] }),
      col({
        id: "Contratto firmato",
        deferred: true,
        loaded: false,
        loadError: "boom",
        cards: [],
      }),
    ]
    expect(resolveDeepLinkSelection(columns, "R9")).toEqual({
      type: "load-deferred",
      stageIds: ["Non assume con Baze"],
    })
  })

  it("waits while a deferred column is still loading", () => {
    const columns = [
      col({ id: "A", cards: [card("R0")] }),
      col({
        id: "Contratto firmato",
        deferred: true,
        loaded: false,
        loading: true,
        cards: [],
      }),
    ]
    expect(resolveDeepLinkSelection(columns, "R9")).toEqual({ type: "wait" })
  })

  it("prefers selecting a found card over loading deferred columns", () => {
    const columns = [
      col({ id: "A", cards: [card("R1")] }),
      col({ id: "Contratto firmato", deferred: true, loaded: false, cards: [] }),
    ]
    expect(resolveDeepLinkSelection(columns, "R1").type).toBe("select")
  })
})
