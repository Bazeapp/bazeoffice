import { describe, expect, it } from "vitest"

import { resolveCommentStack } from "../resolve-comment-stack"
import type { EntityRef } from "../../types/entity"

const IDS = {
  famiglia: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  lavoratore: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ricerca: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  candidatura: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  rapporto: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  assunzione: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  variazione: "11111111-1111-4111-8111-111111111111",
  chiusura: "22222222-2222-4222-8222-222222222222",
  cedolino: "33333333-3333-4333-8333-333333333333",
  contributi: "44444444-4444-4444-8444-444444444444",
  ticket: "55555555-5555-4555-8555-555555555555",
} as const

const NAMES: Record<string, string> = {
  [`famiglia:${IDS.famiglia}`]: "Famiglia Rossi",
  [`lavoratore:${IDS.lavoratore}`]: "Luigi Bianchi",
  [`ricerca:${IDS.ricerca}`]: "Ricerca badante Milano",
  [`candidatura:${IDS.candidatura}`]: "In colloquio",
  [`rapporto:${IDS.rapporto}`]: "RAP-001",
  [`assunzione:${IDS.assunzione}`]: "Assunzione badante",
  [`variazione:${IDS.variazione}`]: "Variazione ore",
  [`chiusura:${IDS.chiusura}`]: "Chiusura Rossi",
  [`cedolino:${IDS.cedolino}`]: "Cedolino marzo",
  [`contributi:${IDS.contributi}`]: "Q1 2026",
  [`ticket:${IDS.ticket}`]: "Ticket payroll",
}

function focus(entityType: EntityRef["entityType"], entityId: string): EntityRef {
  return { entityType, entityId }
}

function entitySectionKinds(result: ReturnType<typeof resolveCommentStack>) {
  return result.sections
    .filter((section) => section.kind !== "descendants")
    .map((section) => section.entityRef?.entityType)
}

describe("resolveCommentStack", () => {
  it("builds candidatura focus with lavoratore, ricerca, famiglia and collegate", () => {
    const result = resolveCommentStack({
      focus: focus("candidatura", IDS.candidatura),
      row: {
        id: IDS.candidatura,
        lavoratore_id: IDS.lavoratore,
        processo_matching_id: IDS.ricerca,
        process: { famiglia_id: IDS.famiglia },
      },
      displayNames: NAMES,
    })

    expect(entitySectionKinds(result)).toEqual([
      "candidatura",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
    expect(result.sections.at(-1)?.kind).toBe("descendants")
    expect(result.chipOptions).toHaveLength(4)
    expect(result.visibilityHintsByTarget[`famiglia:${IDS.famiglia}`]).toBe(
      "In colloquio, Luigi Bianchi, Ricerca badante Milano",
    )
  })

  it("resolves candidatura ancestors for E2E seed UUIDs (version 0000)", () => {
    const e2eIds = {
      candidatura: "00000000-0000-0000-0000-00000000f901",
      ricerca: "00000000-0000-0000-0000-00000000b00c",
      lavoratore: "00000000-0000-0000-0000-00000000c003",
      famiglia: "00000000-0000-0000-0000-00000000f001",
    } as const

    const result = resolveCommentStack({
      focus: focus("candidatura", e2eIds.candidatura),
      row: {
        id: e2eIds.candidatura,
        lavoratore_id: e2eIds.lavoratore,
        processo_matching_id: e2eIds.ricerca,
        processi_matching_id: e2eIds.ricerca,
        famiglia_id: e2eIds.famiglia,
      },
      displayNames: {
        [`candidatura:${e2eIds.candidatura}`]: "E2E Lavoratore Verdi",
        [`lavoratore:${e2eIds.lavoratore}`]: "E2E Lavoratore Verdi",
        [`ricerca:${e2eIds.ricerca}`]: "E2E Famiglia Rossi",
        [`famiglia:${e2eIds.famiglia}`]: "E2E Famiglia Rossi",
      },
    })

    expect(entitySectionKinds(result)).toEqual([
      "candidatura",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("builds ricerca focus with famiglia only (no candidatura)", () => {
    const result = resolveCommentStack({
      focus: focus("ricerca", IDS.ricerca),
      row: {
        id: IDS.ricerca,
        famiglia_id: IDS.famiglia,
      },
      displayNames: NAMES,
    })

    expect(entitySectionKinds(result)).toEqual(["ricerca", "famiglia"])
    expect(result.chipOptions.map((ref) => ref.entityType)).toEqual(["ricerca", "famiglia"])
  })

  it("includes ricerca on rapporto focus when processi_matching_id is present", () => {
    const result = resolveCommentStack({
      focus: focus("rapporto", IDS.rapporto),
      row: {
        id: IDS.rapporto,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: IDS.ricerca,
        famiglia_id: IDS.famiglia,
      },
      displayNames: NAMES,
    })

    expect(entitySectionKinds(result)).toEqual([
      "rapporto",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("covers l0 entities with only descendants aggregation", () => {
    const lavoratore = resolveCommentStack({
      focus: focus("lavoratore", IDS.lavoratore),
      row: { id: IDS.lavoratore },
      displayNames: NAMES,
    })
    const famiglia = resolveCommentStack({
      focus: focus("famiglia", IDS.famiglia),
      row: { id: IDS.famiglia },
      displayNames: NAMES,
    })

    expect(entitySectionKinds(lavoratore)).toEqual(["lavoratore"])
    expect(entitySectionKinds(famiglia)).toEqual(["famiglia"])
    expect(lavoratore.sections.at(-1)?.typeLabel).toBe("COLLEGATE")
    expect(lavoratore.sections.at(-1)?.displayName).toBe("")
    expect(lavoratore.visibilityHintsByTarget[`lavoratore:${IDS.lavoratore}`]).toBe(
      "tutte le ricerche in cui compare",
    )
  })

  it("walks rapporto chain for l3 document focuses", () => {
    const rapportoRow = {
      id: IDS.rapporto,
      lavoratore_id: IDS.lavoratore,
      processi_matching_id: IDS.ricerca,
      famiglia_id: IDS.famiglia,
    }

    const variazione = resolveCommentStack({
      focus: focus("variazione", IDS.variazione),
      row: {
        id: IDS.variazione,
        rapporto_lavorativo_id: IDS.rapporto,
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    const cedolino = resolveCommentStack({
      focus: focus("cedolino", IDS.cedolino),
      row: {
        id: IDS.cedolino,
        rapporto_lavorativo_id: IDS.rapporto,
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    const contributi = resolveCommentStack({
      focus: focus("contributi", IDS.contributi),
      row: {
        id: IDS.contributi,
        rapporto_lavorativo_id: IDS.rapporto,
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    for (const result of [variazione, cedolino, contributi]) {
      expect(entitySectionKinds(result)).toEqual([
        result.sections[0]?.entityRef?.entityType,
        "rapporto",
        "lavoratore",
        "ricerca",
        "famiglia",
      ])
    }
  })

  it("covers assunzione, chiusura, and ticket focus types", () => {
    const rapportoRow = {
      id: IDS.rapporto,
      lavoratore_id: IDS.lavoratore,
      processi_matching_id: IDS.ricerca,
      famiglia_id: IDS.famiglia,
    }

    const assunzione = resolveCommentStack({
      focus: focus("assunzione", IDS.assunzione),
      row: {
        id: IDS.assunzione,
        rapporto_lavorativo_id: IDS.rapporto,
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    const chiusura = resolveCommentStack({
      focus: focus("chiusura", IDS.chiusura),
      row: {
        record: { id: IDS.chiusura, nome: "Mario", cognome: "Verdi" },
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    const ticket = resolveCommentStack({
      focus: focus("ticket", IDS.ticket),
      row: {
        id: IDS.ticket,
        rapporto_id: IDS.rapporto,
        rapporto: rapportoRow,
      },
      displayNames: NAMES,
    })

    const contractSections = ["rapporto", "lavoratore", "ricerca", "famiglia"] as const
    expect(entitySectionKinds(assunzione)).toEqual(["assunzione", ...contractSections])
    expect(entitySectionKinds(chiusura)).toEqual(["chiusura", ...contractSections])
    expect(entitySectionKinds(ticket)).toEqual(["ticket", ...contractSections])
  })

  it("caps ancestor sections at five", () => {
    const result = resolveCommentStack({
      focus: focus("chiusura", IDS.chiusura),
      row: {
        record: { id: IDS.chiusura },
        rapporto: {
          id: IDS.rapporto,
          lavoratore_id: IDS.lavoratore,
          processi_matching_id: IDS.ricerca,
          famiglia_id: IDS.famiglia,
        },
      },
      displayNames: NAMES,
    })

    const ancestors = result.sections.filter((section) => section.kind === "ancestor")
    expect(ancestors.length).toBeLessThanOrEqual(5)
  })
})
