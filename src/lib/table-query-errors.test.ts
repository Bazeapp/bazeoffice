import { describe, expect, it } from "vitest"

import {
  getTableQueryLoadErrorMessage,
  isTransientTableQueryError,
} from "@/lib/table-query-errors"

describe("isTransientTableQueryError", () => {
  it("detects transient edge-function failures", () => {
    expect(isTransientTableQueryError(new Error("503 Service Unavailable"))).toBe(true)
    expect(isTransientTableQueryError("temporarily unavailable")).toBe(true)
    expect(isTransientTableQueryError("SUPABASE_EDGE_RUNTIME_ERROR")).toBe(true)
    expect(isTransientTableQueryError("Edge function timeout")).toBe(true)
  })

  it("returns false for non-transient errors", () => {
    expect(isTransientTableQueryError(new Error("permission denied"))).toBe(false)
    expect(isTransientTableQueryError("not found")).toBe(false)
  })
})

describe("getTableQueryLoadErrorMessage", () => {
  it("uses the transient message for retryable failures", () => {
    expect(
      getTableQueryLoadErrorMessage(
        new Error("503"),
        "Errore generico",
        "Servizio temporaneamente non disponibile",
      ),
    ).toBe("Servizio temporaneamente non disponibile")
  })

  it("uses the fallback for other failures", () => {
    expect(getTableQueryLoadErrorMessage(new Error("boom"), "Errore generico")).toBe(
      "Errore generico",
    )
  })
})
