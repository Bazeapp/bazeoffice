// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest"

import {
  buildPathForRoute,
  resolveRouteStateFromPath,
  type AppRoute,
} from "@/routes/app-routes"

/**
 * BAZ-19 relies on a push-vs-replace decision when navigating the ricerca
 * detail. This mirrors `syncBrowserUrl` from `app-shell.tsx` (module-private
 * there) and exercises it against the REAL `buildPathForRoute` /
 * `resolveRouteStateFromPath` and the real `window.history`, so the guard
 * survives even if the shell handler is refactored.
 */
function syncBrowserUrl(route: AppRoute, mode: "push" | "replace" = "push") {
  const target = buildPathForRoute(route)
  if (window.location.pathname === target) return
  if (mode === "replace") {
    window.history.replaceState({}, "", target)
    return
  }
  window.history.pushState({}, "", target)
}

const ricerca = (over: Partial<AppRoute>): AppRoute => ({
  mainSection: "ricerca_pipeline",
  anagraficheTab: "famiglie",
  ricercaProcessId: null,
  ...over,
})

describe("BAZ-19 — history semantics for deep ricerca navigation", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      buildPathForRoute(ricerca({ ricercaProcessId: "X" })),
    )
  })

  it("focus replaces (no new entry), related-search pushes, and Back restores both ids", () => {
    const lenAtDetail = window.history.length

    // 1) User focuses lavoratore S1 inside ricerca X -> REPLACE (annotate URL).
    syncBrowserUrl(
      ricerca({ ricercaProcessId: "X", ricercaSelectionId: "S1" }),
      "replace",
    )
    expect(window.location.pathname).toContain("ricerca/X/S1")
    expect(window.history.length).toBe(lenAtDetail)

    const urlBeforeRelated = window.location.pathname

    // 2) User opens a related ricerca 2 (worker's selezione S2) -> PUSH.
    syncBrowserUrl(
      ricerca({ ricercaProcessId: "2", ricercaSelectionId: "S2" }),
      "push",
    )
    expect(window.location.pathname).toContain("ricerca/2/S2")
    expect(window.history.length).toBe(lenAtDetail + 1)

    // 3) Browser Back -> popstate handler = resolveRouteStateFromPath(pathname).
    const restored = resolveRouteStateFromPath(urlBeforeRelated)
    expect(restored.ricercaProcessId).toBe("X")
    expect(restored.ricercaSelectionId).toBe("S1")
  })

  it("top-level/sidebar navigation replaces and does not grow history", () => {
    const len = window.history.length
    syncBrowserUrl(
      { mainSection: "anagrafiche", anagraficheTab: "famiglie", ricercaProcessId: null },
      "replace",
    )
    expect(window.history.length).toBe(len)
  })
})
