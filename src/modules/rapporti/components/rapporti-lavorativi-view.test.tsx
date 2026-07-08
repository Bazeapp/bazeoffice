import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

/**
 * Guards the wiring that keeps the rapporti board selection in the URL (so the
 * browser Back button — e.g. after the "Datore" deep-link to Assunzioni —
 * restores the open rapporto). If the view effect that reports the selection to
 * the shell were removed/broken, the fresh-mount auto-select path would sync
 * nothing and silently regress; this test fails in that case.
 *
 * The heavy data hook and the two panels are stubbed (codebase convention:
 * don't render the real board), leaving just the view's selection→shell effect.
 */
const h = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}))

vi.mock("../hooks/use-rapporti-lavorativi-data", () => ({
  useRapportiLavorativiData: () => h.state,
}))
vi.mock("./rapporti-list-panel", () => ({
  RapportiListPanel: () => null,
}))
vi.mock("./rapporto-detail-panel", () => ({
  RapportoDetailPanel: () => null,
}))

import { RapportiLavorativiView } from "./rapporti-lavorativi-view"

function stubState(selectedRapportoId: string | null) {
  return {
    selectedRapportoId,
    setSelectedRapportoId: () => {},
    rapportoAssunzioneNames: {},
    selectedAssunzioneNames: null,
  }
}

describe("RapportiLavorativiView — reports selection to the shell for URL sync", () => {
  it("notifies onSelectRapporto with the selected id (covers hook auto-select-first)", () => {
    h.state = stubState("R1")
    const onSelectRapporto = vi.fn()
    renderWithProviders(<RapportiLavorativiView onSelectRapporto={onSelectRapporto} />)
    expect(onSelectRapporto).toHaveBeenCalledWith("R1")
  })

  it("notifies onSelectRapporto with null when nothing is selected", () => {
    h.state = stubState(null)
    const onSelectRapporto = vi.fn()
    renderWithProviders(<RapportiLavorativiView onSelectRapporto={onSelectRapporto} />)
    expect(onSelectRapporto).toHaveBeenCalledWith(null)
  })
})
