import { describe, expect, it } from "vitest"

import {
  getCalendarEventKind,
  getCalendarEventStatusKey,
  isSelectionCalendarProva,
} from "../lib/colloqui-calendar-utils"
import type { ColloquioCalendarEvent } from "../types"
import type { ProcessoMatchingRecord } from "@/types"

function process(
  tipoIncontro: string | null,
): Pick<ProcessoMatchingRecord, "tipo_incontro_famiglia_lavoratore"> {
  return { tipo_incontro_famiglia_lavoratore: tipoIncontro }
}

function colloquioEvent(
  overrides: Partial<Omit<Extract<ColloquioCalendarEvent, { type: "colloquio" }>, "type">> & {
    selection?: Record<string, unknown>
    process?: ProcessoMatchingRecord | null
  } = {},
): Extract<ColloquioCalendarEvent, { type: "colloquio" }> {
  const { selection, process: processOverride, ...rest } = overrides
  return {
    id: "colloquio-1",
    type: "colloquio",
    title: "Famiglia · Lavoratore",
    start: "2026-07-28T07:00:00.000Z",
    allDay: false,
    selection: { stato_selezione: "Colloquio schedulato", ...(selection ?? {}) },
    process: (processOverride ?? null) as ProcessoMatchingRecord | null,
    famiglia: null,
    lavoratore: null,
    workerAvatarUrl: null,
    status: "Colloquio schedulato",
    tone: "ok",
    ...rest,
  }
}

describe("isSelectionCalendarProva", () => {
  it("detects Prova diretta from tipo incontro", () => {
    expect(
      isSelectionCalendarProva(
        { stato_selezione: "Colloquio schedulato" },
        process("Prova diretta"),
      ),
    ).toBe(true)
  })

  it("detects lookup-key form prova_diretta after underscore normalization", () => {
    expect(
      isSelectionCalendarProva(
        { stato_selezione: "Colloquio schedulato" },
        process("prova_diretta"),
      ),
    ).toBe(true)
  })

  it("returns false when process is missing and stato is colloquio", () => {
    expect(
      isSelectionCalendarProva({ stato_selezione: "Colloquio schedulato" }, null),
    ).toBe(false)
  })

  it("detects prova schedulata from stato selezione", () => {
    expect(
      isSelectionCalendarProva({ stato_selezione: "Prova schedulata" }, process("Videochiamata")),
    ).toBe(true)
  })

  it("returns false for a normal colloquio", () => {
    expect(
      isSelectionCalendarProva(
        { stato_selezione: "Colloquio schedulato" },
        process("Colloquio video"),
      ),
    ).toBe(false)
  })
})

describe("getCalendarEventKind", () => {
  it("keeps rapporto-backed prove as prova", () => {
    const event: ColloquioCalendarEvent = {
      id: "prova-1",
      type: "prova",
      title: "Famiglia — Lavoratore",
      start: "2026-07-28",
      allDay: true,
      card: {
        id: "rapporto-1",
        rapporto: {} as never,
        famiglia: null,
        lavoratore: null,
        title: "Famiglia — Lavoratore",
        famigliaLabel: "Famiglia",
        lavoratoreLabel: "Lavoratore",
        workerAvatarUrl: null,
      },
      status: "In prova",
      tone: "ok",
    }
    expect(getCalendarEventKind(event)).toBe("prova")
  })

  it("classifies selection events with Prova diretta as prova (BAZ-152)", () => {
    expect(
      getCalendarEventKind(
        colloquioEvent({
          process: process("Prova diretta") as ProcessoMatchingRecord,
          selection: { stato_selezione: "Colloquio schedulato" },
        }),
      ),
    ).toBe("prova")
  })

  it("classifies selection events with prova schedulata as prova", () => {
    expect(
      getCalendarEventKind(
        colloquioEvent({
          selection: { stato_selezione: "prova schedulata" },
          status: "prova schedulata",
        }),
      ),
    ).toBe("prova")
  })

  it("keeps genuine colloquio selections as colloquio", () => {
    expect(
      getCalendarEventKind(
        colloquioEvent({
          process: process("Colloquio video") as ProcessoMatchingRecord,
        }),
      ),
    ).toBe("colloquio")
  })
})

describe("getCalendarEventStatusKey", () => {
  it("maps Prova diretta selection events to prova, not colloquio (BAZ-152)", () => {
    expect(
      getCalendarEventStatusKey(
        colloquioEvent({
          process: process("Prova diretta") as ProcessoMatchingRecord,
          selection: { stato_selezione: "Colloquio schedulato" },
          status: "Colloquio schedulato",
        }),
      ),
    ).toBe("prova")
  })

  it("keeps genuine colloquio status as colloquio", () => {
    expect(
      getCalendarEventStatusKey(
        colloquioEvent({
          process: process("Colloquio video") as ProcessoMatchingRecord,
          status: "Colloquio schedulato",
        }),
      ),
    ).toBe("colloquio")
  })
})
