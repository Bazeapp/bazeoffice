import { describe, expect, it } from "vitest"

import {
  buildPathForRoute,
  resolveRouteStateFromPath,
  type AppRoute,
} from "@/routes/app-routes"

/**
 * URL-contract tests for the two routing fixes shipped together:
 * - BAZ-20: `selectedAssunzioneRapportoId` → `gestione-contrattuale/assunzioni/{rapportoId}`
 * - BAZ-19: `ricercaSelectionId` → `ricerca/{processId}/{selectionId}`
 *
 * `buildPathForRoute` prefixes `import.meta.env.BASE_URL`, so build assertions
 * use `endsWith` (base-agnostic) and round-trips go through `resolveRouteStateFromPath`
 * which strips the base. The round-trip is exactly what the browser Back button
 * exercises (popstate → resolveRouteStateFromPath).
 */

const assunzioniRoute = (over: Partial<AppRoute> = {}): AppRoute => ({
  mainSection: "gestione_contrattuale_assunzioni",
  anagraficheTab: "famiglie",
  ricercaProcessId: null,
  ...over,
})

const ricercaRoute = (over: Partial<AppRoute> = {}): AppRoute => ({
  mainSection: "ricerca_pipeline",
  anagraficheTab: "famiglie",
  ricercaProcessId: null,
  ...over,
})

describe("BAZ-20 — assunzioni deep-link slug", () => {
  it("builds the 3-segment slug when a rapporto id is selected", () => {
    const path = buildPathForRoute(
      assunzioniRoute({ selectedAssunzioneRapportoId: "R1" }),
    )
    expect(path.endsWith("gestione-contrattuale/assunzioni/R1")).toBe(true)
  })

  it("builds the bare slug when no rapporto id is selected", () => {
    const path = buildPathForRoute(assunzioniRoute())
    expect(path.endsWith("gestione-contrattuale/assunzioni")).toBe(true)
  })

  it("parses the rapporto id out of the slug", () => {
    const route = resolveRouteStateFromPath("/gestione-contrattuale/assunzioni/R1")
    expect(route.mainSection).toBe("gestione_contrattuale_assunzioni")
    expect(route.selectedAssunzioneRapportoId).toBe("R1")
  })

  it("parses a bare assunzioni slug to a null selection", () => {
    const route = resolveRouteStateFromPath("/gestione-contrattuale/assunzioni")
    expect(route.mainSection).toBe("gestione_contrattuale_assunzioni")
    expect(route.selectedAssunzioneRapportoId ?? null).toBeNull()
  })

  it("round-trips build∘resolve for a selected rapporto id", () => {
    const route = assunzioniRoute({ selectedAssunzioneRapportoId: "abc-123" })
    const resolved = resolveRouteStateFromPath(buildPathForRoute(route))
    expect(resolved.mainSection).toBe("gestione_contrattuale_assunzioni")
    expect(resolved.selectedAssunzioneRapportoId).toBe("abc-123")
  })

  it("encodes and decodes ids that contain URL-special characters", () => {
    const route = assunzioniRoute({ selectedAssunzioneRapportoId: "id with/space" })
    const resolved = resolveRouteStateFromPath(buildPathForRoute(route))
    expect(resolved.selectedAssunzioneRapportoId).toBe("id with/space")
  })
})

describe("BAZ-19 — ricerca selection slug", () => {
  it("builds ricerca/{processId}/{selectionId} when both are present", () => {
    const path = buildPathForRoute(
      ricercaRoute({ ricercaProcessId: "P1", ricercaSelectionId: "S1" }),
    )
    expect(path.endsWith("ricerca/P1/S1")).toBe(true)
  })

  it("builds ricerca/{processId} when no selection is focused", () => {
    const path = buildPathForRoute(ricercaRoute({ ricercaProcessId: "P1" }))
    expect(path.endsWith("ricerca/P1")).toBe(true)
  })

  it("builds the bare board slug when there is no process id", () => {
    const path = buildPathForRoute(ricercaRoute())
    expect(path.endsWith("ricerca")).toBe(true)
  })

  it("parses process id and selection id from a 3-segment path", () => {
    const route = resolveRouteStateFromPath("/ricerca/P1/S1")
    expect(route.mainSection).toBe("ricerca_pipeline")
    expect(route.ricercaProcessId).toBe("P1")
    expect(route.ricercaSelectionId).toBe("S1")
  })

  it("parses a 2-segment ricerca path to a null selection", () => {
    const route = resolveRouteStateFromPath("/ricerca/P1")
    expect(route.ricercaProcessId).toBe("P1")
    expect(route.ricercaSelectionId ?? null).toBeNull()
  })

  it("round-trips build∘resolve preserving process and selection", () => {
    const route = ricercaRoute({ ricercaProcessId: "P1", ricercaSelectionId: "S1" })
    const resolved = resolveRouteStateFromPath(buildPathForRoute(route))
    expect(resolved.ricercaProcessId).toBe("P1")
    expect(resolved.ricercaSelectionId).toBe("S1")
  })

  it("REGRESSION: browser Back to a focused ricerca restores BOTH ids", () => {
    // popstate handler = resolveRouteStateFromPath(location.pathname).
    const restored = resolveRouteStateFromPath("/ricerca/ricercaX/selezioneS")
    expect(restored.ricercaProcessId).toBe("ricercaX")
    expect(restored.ricercaSelectionId).toBe("selezioneS")
  })
})

describe("regression — existing routes still resolve unchanged", () => {
  it("keeps the rapporti-lavorativi deep-link working", () => {
    const route = resolveRouteStateFromPath(
      "/gestione-contrattuale/rapporti-lavorativi/RL1",
    )
    expect(route.mainSection).toBe("gestione_contrattuale_rapporti")
    expect(route.selectedRapportoId).toBe("RL1")
  })

  it("keeps the bare ricerca board route working", () => {
    const route = resolveRouteStateFromPath("/ricerca")
    expect(route.mainSection).toBe("ricerca_pipeline")
    expect(route.ricercaProcessId ?? null).toBeNull()
  })

  it("keeps the cerca-lavoratori worker slug working", () => {
    const route = resolveRouteStateFromPath("/cerca-lavoratori/W1")
    expect(route.mainSection).toBe("lavoratori_cerca")
    expect(route.selectedWorkerId).toBe("W1")
  })
})
