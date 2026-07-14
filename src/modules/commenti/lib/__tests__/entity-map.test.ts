import { describe, expect, it } from "vitest"

import {
  ENTITY_TYPE_TO_TABLE,
  isEntityType,
  tableForEntityType,
} from "../entity-map"

describe("entity-map", () => {
  it("maps PRD shorthand tables to repo table names", () => {
    expect(tableForEntityType("chiusura")).toBe("chiusure_contratti")
    expect(tableForEntityType("variazione")).toBe("variazioni_contrattuali")
    expect(tableForEntityType("ricerca")).toBe("processi_matching")
    expect(tableForEntityType("candidatura")).toBe("selezioni_lavoratori")
  })

  it("exports a table for every entity type", () => {
    for (const [entityType, table] of Object.entries(ENTITY_TYPE_TO_TABLE)) {
      expect(table.length).toBeGreaterThan(0)
      expect(isEntityType(entityType)).toBe(true)
    }
  })
})
