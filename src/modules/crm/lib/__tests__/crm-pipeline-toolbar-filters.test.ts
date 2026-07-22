import { afterEach, describe, expect, it } from "vitest"

import {
  CRM_PIPELINE_FILTERS_STORAGE_KEY,
  EMPTY_TOOLBAR_FILTERS,
  buildServerFilters,
  getDatePresetFilterPatch,
  hasActiveToolbarFilters,
  readStoredToolbarFilters,
  sanitizeToolbarFilters,
  serializeToolbarFilters,
  toggleFilterValue,
} from "../crm-pipeline-toolbar-filters"

describe("sanitizeToolbarFilters", () => {
  it("returns empty filters for invalid input", () => {
    expect(sanitizeToolbarFilters(null)).toEqual(EMPTY_TOOLBAR_FILTERS)
    expect(sanitizeToolbarFilters("bad")).toEqual(EMPTY_TOOLBAR_FILTERS)
  })

  it("keeps valid fields and coerces invalid ones", () => {
    expect(
      sanitizeToolbarFilters({
        createdFrom: "2026-01-01T10:00",
        createdTo: 42,
        tipoLavoro: ["Badante", 3, "Colf"],
        preventivoAccettato: "yes",
        chiamataPrenotata: "maybe",
      }),
    ).toEqual({
      createdFrom: "2026-01-01T10:00",
      createdTo: "",
      tipoLavoro: ["Badante", "Colf"],
      preventivoAccettato: "yes",
      chiamataPrenotata: "all",
    })
  })
})

describe("readStoredToolbarFilters", () => {
  afterEach(() => {
    window.localStorage.removeItem(CRM_PIPELINE_FILTERS_STORAGE_KEY)
  })

  it("returns empty filters when nothing is stored", () => {
    expect(readStoredToolbarFilters()).toEqual(EMPTY_TOOLBAR_FILTERS)
  })

  it("reads and sanitizes stored filters", () => {
    window.localStorage.setItem(
      CRM_PIPELINE_FILTERS_STORAGE_KEY,
      JSON.stringify({
        createdFrom: "2026-02-01T08:00",
        tipoLavoro: ["Badante"],
        preventivoAccettato: "no",
      }),
    )

    expect(readStoredToolbarFilters()).toEqual({
      createdFrom: "2026-02-01T08:00",
      createdTo: "",
      tipoLavoro: ["Badante"],
      preventivoAccettato: "no",
      chiamataPrenotata: "all",
    })
  })

  it("returns empty filters when stored JSON is invalid", () => {
    window.localStorage.setItem(CRM_PIPELINE_FILTERS_STORAGE_KEY, "{not-json")

    expect(readStoredToolbarFilters()).toEqual(EMPTY_TOOLBAR_FILTERS)
  })
})

describe("buildServerFilters", () => {
  it("maps toolbar filters to server filter shape", () => {
    expect(
      buildServerFilters({
        createdFrom: "",
        createdTo: "",
        tipoLavoro: ["Badante", "Colf"],
        preventivoAccettato: "yes",
        chiamataPrenotata: "no",
      }),
    ).toEqual({
      createdFrom: null,
      createdTo: null,
      tipoLavoro: ["Badante", "Colf"],
      preventivoAccettato: true,
      chiamataPrenotata: false,
    })
  })
})

describe("getDatePresetFilterPatch", () => {
  it("returns null for the custom preset", () => {
    expect(getDatePresetFilterPatch("custom")).toBeNull()
  })

  it("builds a 24h range from the provided clock", () => {
    const now = new Date("2026-07-10T12:00:00.000Z")
    const patch = getDatePresetFilterPatch("24h", now)

    expect(patch).not.toBeNull()
    expect(patch?.createdTo).toBeTruthy()
    expect(patch?.createdFrom).toBeTruthy()
    expect(patch?.createdFrom).not.toBe(patch?.createdTo)
  })

  it("builds a year-to-date range starting on January 1", () => {
    const now = new Date("2026-07-10T12:00:00.000Z")
    const patch = getDatePresetFilterPatch("year", now)

    expect(patch).not.toBeNull()
    expect(patch?.createdTo).toBeTruthy()
    expect(patch?.createdFrom.startsWith("2026-01-01T")).toBe(true)
  })
})

describe("toggleFilterValue", () => {
  it("adds and removes values without duplicates", () => {
    expect(toggleFilterValue(["A"], "B", true)).toEqual(["A", "B"])
    expect(toggleFilterValue(["A", "B"], "B", true)).toEqual(["A", "B"])
    expect(toggleFilterValue(["A", "B"], "B", false)).toEqual(["A"])
  })
})

describe("hasActiveToolbarFilters", () => {
  it("detects any non-default toolbar filter", () => {
    expect(hasActiveToolbarFilters(EMPTY_TOOLBAR_FILTERS)).toBe(false)
    expect(
      hasActiveToolbarFilters({
        ...EMPTY_TOOLBAR_FILTERS,
        tipoLavoro: ["Badante"],
      }),
    ).toBe(true)
    expect(
      hasActiveToolbarFilters({
        ...EMPTY_TOOLBAR_FILTERS,
        preventivoAccettato: "yes",
      }),
    ).toBe(true)
  })
})

describe("serializeToolbarFilters", () => {
  it("sorts tipoLavoro for stable comparisons", () => {
    const left = serializeToolbarFilters({
      ...EMPTY_TOOLBAR_FILTERS,
      tipoLavoro: ["Colf", "Badante"],
      preventivoAccettato: "yes",
    })
    const right = serializeToolbarFilters({
      ...EMPTY_TOOLBAR_FILTERS,
      tipoLavoro: ["Badante", "Colf"],
      preventivoAccettato: "yes",
    })

    expect(left).toBe(right)
    expect(JSON.parse(left).tipoLavoro).toEqual(["Badante", "Colf"])
  })
})
