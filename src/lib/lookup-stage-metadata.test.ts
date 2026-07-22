import { describe, expect, it } from "vitest"

import {
  buildStageMetadataFromDefaults,
  buildStageMetadataFromLookupRows,
} from "@/lib/lookup-stage-metadata"
import type { LookupValueRecord } from "@/types"

const DEFAULT_STAGES = [
  { id: "todo", label: "TODO", color: "sky" },
  { id: "done", label: "DONE", color: "green" },
]

function lookupRow(partial: Partial<LookupValueRecord>): LookupValueRecord {
  return {
    id: "1",
    entity_table: "mesi_lavorati",
    entity_field: "stato_mese_lavorativo",
    value_key: "todo",
    value_label: "Da fare",
    sort_order: 1,
    is_active: true,
    metadata: { color: "blue" },
    ...partial,
  }
}

describe("buildStageMetadataFromDefaults", () => {
  it("merges lookup label/color onto default stages", () => {
    const result = buildStageMetadataFromDefaults({
      defaultStages: DEFAULT_STAGES,
      lookupRows: [lookupRow({ value_label: "Da fare aggiornato", metadata: { color: "cyan" } })],
      entityTable: "mesi_lavorati",
      entityField: "stato_mese_lavorativo",
    })

    expect(result.definitions[0]?.label).toBe("Da fare aggiornato")
    expect(result.definitions[0]?.color).toBe("cyan")
    expect(result.aliases.get("da fare aggiornato")).toBe("todo")
  })

  it("applies legacyAliases", () => {
    const result = buildStageMetadataFromDefaults({
      defaultStages: DEFAULT_STAGES,
      lookupRows: [],
      entityTable: "mesi_lavorati",
      entityField: "stato_mese_lavorativo",
      legacyAliases: { done_legacy: "done" },
    })
    expect(result.aliases.get("done legacy")).toBe("done")
  })
})

describe("buildStageMetadataFromLookupRows", () => {
  it("builds definitions only from active lookup rows", () => {
    const result = buildStageMetadataFromLookupRows({
      lookupRows: [
        lookupRow({
          entity_table: "processi_matching",
          entity_field: "stato_res",
          value_key: "aperto",
          value_label: "Aperto",
        }),
      ],
      entityTable: "processi_matching",
      entityField: "stato_res",
    })
    expect(result.definitions).toHaveLength(1)
    expect(result.definitions[0]?.id).toBe("aperto")
  })
})
