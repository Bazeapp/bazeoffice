import { describe, expect, it } from "vitest"

import { parseEdgeFunctionErrorBody } from "./cedolini-edge-function-error"

describe("parseEdgeFunctionErrorBody", () => {
  it("estrae il body JSON strutturato dal messaggio di errore di invokeEdgeFunction", () => {
    const error = new Error(
      "Edge function 'cedolini-recover-url' failed (503): {\"recovered\":false,\"error\":\"drive_not_configured\"}",
    )
    expect(parseEdgeFunctionErrorBody(error)).toEqual({
      recovered: false,
      error: "drive_not_configured",
    })
  })

  it("EDGE: non un Error → null", () => {
    expect(parseEdgeFunctionErrorBody("boom")).toBeNull()
    expect(parseEdgeFunctionErrorBody(null)).toBeNull()
  })

  it("EDGE: messaggio senza il marker '): ' → null", () => {
    expect(parseEdgeFunctionErrorBody(new Error("Failed to fetch"))).toBeNull()
  })

  it("EDGE: body non-JSON → null", () => {
    expect(
      parseEdgeFunctionErrorBody(new Error("Edge function 'x' failed (500): not json")),
    ).toBeNull()
  })

  it("EDGE: body JSON è un array → null (non un record)", () => {
    expect(
      parseEdgeFunctionErrorBody(new Error("Edge function 'x' failed (500): [1,2,3]")),
    ).toBeNull()
  })
})
