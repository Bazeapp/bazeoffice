import { afterEach, describe, expect, it } from "vitest"

import {
  CRM_PIPELINE_SALES_FILTER_ALL,
  CRM_PIPELINE_SALES_FILTER_STORAGE_KEY,
  CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
  readStoredSalesFilter,
  resolveSalesFilter,
  salesFilterToServerParams,
  sanitizeSalesFilter,
  writeStoredSalesFilter,
} from "./crm-pipeline-sales-filter"

const SELECTABLE = ["op-self", "op-other"] as const

describe("sanitizeSalesFilter", () => {
  it("accepts non-empty strings and rejects everything else", () => {
    expect(sanitizeSalesFilter("op-1")).toBe("op-1")
    expect(sanitizeSalesFilter("  all  ")).toBe("all")
    expect(sanitizeSalesFilter("")).toBeNull()
    expect(sanitizeSalesFilter("   ")).toBeNull()
    expect(sanitizeSalesFilter(null)).toBeNull()
    expect(sanitizeSalesFilter(3)).toBeNull()
  })
})

describe("resolveSalesFilter", () => {
  it("defaults to the logged-in sales operator when nothing is stored", () => {
    expect(
      resolveSalesFilter({
        stored: null,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-self")
  })

  it("keeps a persisted special filter", () => {
    expect(
      resolveSalesFilter({
        stored: CRM_PIPELINE_SALES_FILTER_ALL,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(CRM_PIPELINE_SALES_FILTER_ALL)

    expect(
      resolveSalesFilter({
        stored: CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(CRM_PIPELINE_SALES_FILTER_UNASSIGNED)
  })

  it("keeps a persisted selectable operator even when it is not the current user", () => {
    expect(
      resolveSalesFilter({
        stored: "op-other",
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-other")
  })

  it("falls back to the current sales operator when the stored operator left the list", () => {
    expect(
      resolveSalesFilter({
        stored: "op-gone",
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-self")
  })

  it("falls back to all when the current user is not a selectable sales operator", () => {
    expect(
      resolveSalesFilter({
        stored: null,
        currentOperatorId: "op-admin",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(CRM_PIPELINE_SALES_FILTER_ALL)

    expect(
      resolveSalesFilter({
        stored: null,
        currentOperatorId: null,
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(CRM_PIPELINE_SALES_FILTER_ALL)
  })
})

describe("salesFilterToServerParams", () => {
  it("maps all / unassigned / operator id to RPC params", () => {
    expect(salesFilterToServerParams(CRM_PIPELINE_SALES_FILTER_ALL)).toEqual({
      salesOperatorId: null,
      salesUnassigned: null,
    })
    expect(
      salesFilterToServerParams(CRM_PIPELINE_SALES_FILTER_UNASSIGNED),
    ).toEqual({
      salesOperatorId: null,
      salesUnassigned: true,
    })
    expect(salesFilterToServerParams("op-self")).toEqual({
      salesOperatorId: "op-self",
      salesUnassigned: null,
    })
  })
})

describe("readStoredSalesFilter / writeStoredSalesFilter", () => {
  afterEach(() => {
    window.localStorage.removeItem(CRM_PIPELINE_SALES_FILTER_STORAGE_KEY)
  })

  it("returns null when nothing is stored", () => {
    expect(readStoredSalesFilter()).toBeNull()
  })

  it("round-trips a persisted value", () => {
    writeStoredSalesFilter("op-self")
    expect(readStoredSalesFilter()).toBe("op-self")
  })
})
