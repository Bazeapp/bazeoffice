import { describe, expect, it } from "vitest"

import type { LookupOption } from "../lib/lookup-utils"
import { normalizeDomesticRoleDbLabel } from "../lib/base-utils"
import type { QueryFilterGroup, TableColumnMeta } from "@/lib/table-query"
import { collectGate1RpcFilters } from "../lib/gate1-filters"
import {
  inferWorkerFilterType,
  WORKER_SCHEMA_COLUMNS,
} from "../lib/filter-schema"
import { buildWorkerFilterFields } from "../lib/worker-filter-fields"

describe("inferWorkerFilterType", () => {
  const numericFields = [
    "paga_oraria_richiesta",
    "rating_atteggiamento",
    "rating_capacita_comunicative",
    "rating_cura_personale",
    "rating_precisione_puntualita",
  ]

  for (const field of numericFields) {
    it(`returns "number" for ${field}`, () => {
      expect(inferWorkerFilterType(field)).toBe("number")
    })
  }

  it('returns "text" for rating_corporatura (text nel DB)', () => {
    expect(inferWorkerFilterType("rating_corporatura")).toBe("text")
  })

  it('returns "date" for data_di_nascita', () => {
    expect(inferWorkerFilterType("data_di_nascita")).toBe("date")
  })

  it('returns "id" for id', () => {
    expect(inferWorkerFilterType("id")).toBe("id")
  })

  it('returns "text" for sesso', () => {
    expect(inferWorkerFilterType("sesso")).toBe("text")
  })
})

describe("WORKER_SCHEMA_COLUMNS (curated filter catalog)", () => {
  const names = new Set(WORKER_SCHEMA_COLUMNS.map((column) => column.name))

  const hidden = [
    "iban",
    "email",
    "foto",
    "creato_il",
    "aggiornato_il",
    "id",
    "nome",
    "cognome",
    "conoscenza_dellitaliano",
  ]

  for (const field of hidden) {
    it(`does NOT contain ${field}`, () => {
      expect(names.has(field)).toBe(false)
    })
  }

  const present = [
    "followup_chiamata_idoneita",
    "provincia",
    "sesso",
    "paga_oraria_richiesta",
    "disponibilita_lunedi_mattina",
  ]

  for (const field of present) {
    it(`DOES contain ${field}`, () => {
      expect(names.has(field)).toBe(true)
    })
  }
})

describe("buildWorkerFilterFields", () => {
  const provincieOptions: LookupOption[] = [
    { value: "MI", label: "MI" },
    { value: "TO", label: "TO" },
  ]

  const columns: TableColumnMeta[] = [
    { name: "provincia", filterType: "text", dataType: "text", udtName: null },
    { name: "sesso", filterType: "text", dataType: "text", udtName: null },
    {
      name: "paga_oraria_richiesta",
      filterType: "number",
      dataType: "text",
      udtName: null,
    },
  ]

  it("maps provincia to provincia_sigla enum sourced from provincieOptions", () => {
    const fields = buildWorkerFilterFields({
      columns,
      lookupFilterTypeByDomain: new Map(),
      lookupOptionsByDomain: new Map(),
      provincieOptions,
    })
    const provincia = fields.find((field) => field.label && field.value === "provincia_sigla")
    expect(provincia).toBeDefined()
    expect(provincia?.value).toBe("provincia_sigla")
    expect(provincia?.type).toBe("enum")
    expect(provincia?.options).toBe(provincieOptions)
  })

  it("passes through non-provincia columns with their own name as value", () => {
    const fields = buildWorkerFilterFields({
      columns,
      lookupFilterTypeByDomain: new Map(),
      lookupOptionsByDomain: new Map(),
      provincieOptions,
    })
    const sesso = fields.find((field) => field.value === "sesso")
    expect(sesso?.type).toBe("text")
    expect(sesso?.options).toBeUndefined()
  })

  it("maps a multi_enum column, normalizing tipo_lavoro_domestico option values to DB labels", () => {
    const domesticColumns: TableColumnMeta[] = [
      {
        name: "tipo_lavoro_domestico",
        filterType: "text",
        dataType: "text",
        udtName: null,
      },
    ]
    const fields = buildWorkerFilterFields({
      columns: domesticColumns,
      lookupFilterTypeByDomain: new Map([
        ["lavoratori.tipo_lavoro_domestico", "multi_enum"],
      ]),
      lookupOptionsByDomain: new Map([
        [
          "lavoratori.tipo_lavoro_domestico",
          [
            { value: "colf_pulizie", label: "Colf" },
            { value: "assistenza_domestica_badante", label: "Badante" },
          ],
        ],
      ]),
      provincieOptions: [],
    })

    const tipo = fields.find((field) => field.value === "tipo_lavoro_domestico")
    expect(tipo?.type).toBe("multi_enum")
    // The option VALUE is the canonical DB label (normalizeDomesticRoleDbLabel),
    // while the option LABEL stays the raw lookup label.
    expect(tipo?.options).toEqual([
      { value: normalizeDomesticRoleDbLabel("Colf"), label: "Colf" },
      { value: normalizeDomesticRoleDbLabel("Badante"), label: "Badante" },
    ])
  })

  it("maps a plain enum column using the raw label as the option value (no normalize path)", () => {
    const sessoColumns: TableColumnMeta[] = [
      { name: "sesso", filterType: "text", dataType: "text", udtName: null },
    ]
    const fields = buildWorkerFilterFields({
      columns: sessoColumns,
      lookupFilterTypeByDomain: new Map([["lavoratori.sesso", "enum"]]),
      lookupOptionsByDomain: new Map([
        [
          "lavoratori.sesso",
          [
            { value: "donna", label: "Donna" },
            { value: "uomo", label: "Uomo" },
          ],
        ],
      ]),
      provincieOptions: [],
    })

    const sesso = fields.find((field) => field.value === "sesso")
    expect(sesso?.type).toBe("enum")
    // Only tipo_lavoro_domestico normalizes; other enums use the label as value.
    expect(sesso?.options).toEqual([
      { value: "Donna", label: "Donna" },
      { value: "Uomo", label: "Uomo" },
    ])
  })
})

describe("collectGate1RpcFilters", () => {
  it("flattens a nested AND group to a flat array", () => {
    const group: QueryFilterGroup = {
      kind: "group",
      id: "root",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "c1",
          field: "sesso",
          operator: "is",
          value: "F",
        },
        {
          kind: "group",
          id: "nested",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "c2",
              field: "provincia_sigla",
              operator: "is",
              value: "MI",
            },
          ],
        },
      ],
    }

    const result = collectGate1RpcFilters(group)
    expect(result).toEqual([
      { field: "sesso", operator: "is", value: "F", valueTo: undefined },
      { field: "provincia_sigla", operator: "is", value: "MI", valueTo: undefined },
    ])
  })

  it("returns null when the top-level logic is OR", () => {
    const group: QueryFilterGroup = {
      kind: "group",
      id: "root",
      logic: "or",
      nodes: [
        { kind: "condition", id: "c1", field: "sesso", operator: "is", value: "F" },
      ],
    }
    expect(collectGate1RpcFilters(group)).toBeNull()
  })

  it("returns null when a nested group uses OR logic", () => {
    const group: QueryFilterGroup = {
      kind: "group",
      id: "root",
      logic: "and",
      nodes: [
        {
          kind: "group",
          id: "nested",
          logic: "or",
          nodes: [
            { kind: "condition", id: "c1", field: "sesso", operator: "is", value: "F" },
          ],
        },
      ],
    }
    expect(collectGate1RpcFilters(group)).toBeNull()
  })
})
