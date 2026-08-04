import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildCedoliniSearchParams,
  parseCedoliniMode,
  parseCedoliniMonth,
  readCedoliniUrlState,
  replaceCedoliniUrlState,
} from "./cedolini-url-state"

describe("parseCedoliniMode", () => {
  it("accepts known modes", () => {
    expect(parseCedoliniMode("board")).toBe("board")
    expect(parseCedoliniMode("controlli")).toBe("controlli")
    expect(parseCedoliniMode("pagamenti")).toBe("pagamenti")
  })

  it("rejects unknown or empty values", () => {
    expect(parseCedoliniMode(null)).toBeNull()
    expect(parseCedoliniMode("")).toBeNull()
    expect(parseCedoliniMode("Board")).toBeNull()
    expect(parseCedoliniMode("other")).toBeNull()
  })
})

describe("parseCedoliniMonth", () => {
  it("accepts YYYY-MM", () => {
    expect(parseCedoliniMonth("2026-07")).toBe("2026-07")
    expect(parseCedoliniMonth("2026-01")).toBe("2026-01")
    expect(parseCedoliniMonth("2026-12")).toBe("2026-12")
  })

  it("rejects invalid months", () => {
    expect(parseCedoliniMonth(null)).toBeNull()
    expect(parseCedoliniMonth("2026-13")).toBeNull()
    expect(parseCedoliniMonth("26-07")).toBeNull()
    expect(parseCedoliniMonth("2026-7")).toBeNull()
  })
})

describe("readCedoliniUrlState", () => {
  it("falls back to defaults when params are absent", () => {
    expect(
      readCedoliniUrlState("", { mode: "board", month: "2026-07" }),
    ).toEqual({ mode: "board", month: "2026-07" })
  })

  it("reads valid params and ignores invalid ones", () => {
    expect(
      readCedoliniUrlState("?mode=controlli&month=2026-03", {
        mode: "board",
        month: "2026-07",
      }),
    ).toEqual({ mode: "controlli", month: "2026-03" })

    expect(
      readCedoliniUrlState("?mode=nope&month=bad", {
        mode: "board",
        month: "2026-07",
      }),
    ).toEqual({ mode: "board", month: "2026-07" })
  })
})

describe("buildCedoliniSearchParams", () => {
  it("always writes both params", () => {
    expect(buildCedoliniSearchParams({ mode: "board", month: "2026-07" })).toBe(
      "?mode=board&month=2026-07",
    )
  })
})

describe("replaceCedoliniUrlState", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("replaceState with pathname + both params", () => {
    const replaceState = vi.fn()
    vi.stubGlobal("window", {
      location: {
        pathname: "/payroll/cedolini",
        hash: "",
      },
      history: {
        state: { keep: true },
        replaceState,
      },
    })

    replaceCedoliniUrlState({ mode: "pagamenti", month: "2026-01" })

    expect(replaceState).toHaveBeenCalledWith(
      { keep: true },
      "",
      "/payroll/cedolini?mode=pagamenti&month=2026-01",
    )
  })
})
