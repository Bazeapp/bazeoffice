/**
 * U8 — characterization net for `RicercaWorkersPipelineView`.
 *
 * Module-boundary mocks keep the focus on pipeline shell behavior (columns,
 * grouped sections, search filter) without exercising the worker overlay fetch
 * graph.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import { makeEditorReturn } from "@/modules/lavoratori/components/__tests__/gate1-view-test-fixtures"

const { mockUseSelectedWorkerEditor } = vi.hoisted(() => ({
  mockUseSelectedWorkerEditor: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  },
}))

vi.mock("@/lib/record-crud", () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}))

vi.mock("@/lib/ai-generation", () => ({
  invokeAiGenerationFunction: vi.fn(),
}))

vi.mock("@/lib/smart-matching-forward", () => ({
  runSmartMatchingForwardPreview: vi.fn(),
}))

vi.mock("@/lib/availability-functions", () => ({
  getSelectionAvailabilityWorkerIds: vi.fn(() => []),
  invokeWorkerAvailabilityForIds: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/modules/lavoratori/hooks", () => ({
  useSelectedWorkerEditor: (...args: unknown[]) => mockUseSelectedWorkerEditor(...args),
}))

vi.mock("@/hooks/use-current-operator-name", () => ({
  useCurrentOperatorName: () => "Test Operator",
}))

import { RicercaWorkersPipelineView } from "../ricerca-workers-pipeline-view"
import {
  makeGroupedCandidatiColumn,
  makePipelineColumn,
  makePipelineState,
  makePipelineWorker,
  makeProcessCard,
  makeSelectionCard,
} from "./ricerca-workers-pipeline-view-test-fixtures"

describe("RicercaWorkersPipelineView render", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSelectedWorkerEditor.mockImplementation(() => makeEditorReturn())
  })

  it("renders pipeline header and worker cards from pipelineState", () => {
    renderWithProviders(
      <RicercaWorkersPipelineView
        processId="process-1"
        card={makeProcessCard()}
        pipelineState={makePipelineState()}
        recruiterLabelsById={new Map()}
      />,
    )

    expect(screen.getByText("Lavoratori per questa ricerca")).toBeTruthy()
    expect(screen.getByText("Maria Rossi")).toBeTruthy()
    expect(screen.getByText("Candidati")).toBeTruthy()
  })

  it("surfaces pipeline loading and error states", () => {
    const { rerender } = renderWithProviders(
      <RicercaWorkersPipelineView
        processId="process-1"
        card={makeProcessCard()}
        pipelineState={makePipelineState({ loading: true })}
        recruiterLabelsById={new Map()}
      />,
    )

    expect(screen.getByText("Caricamento...")).toBeTruthy()

    rerender(
      <RicercaWorkersPipelineView
        processId="process-1"
        card={makeProcessCard()}
        pipelineState={makePipelineState({ error: "boom" })}
        recruiterLabelsById={new Map()}
      />,
    )

    expect(screen.getByText(/Errore caricamento pipeline lavoratori: boom/)).toBeTruthy()
  })

  it("narrows visible worker cards when the user types in the search box", () => {
    renderWithProviders(
      <RicercaWorkersPipelineView
        processId="process-1"
        card={makeProcessCard()}
        pipelineState={makePipelineState({
          columns: [
            makePipelineColumn({
              cards: [
                makeSelectionCard({
                  id: "sel-a",
                  worker: makePipelineWorker({ id: "w-a", nomeCompleto: "Anna Bianchi" }),
                }),
                makeSelectionCard({
                  id: "sel-b",
                  worker: makePipelineWorker({ id: "w-b", nomeCompleto: "Luca Verdi" }),
                }),
              ],
            }),
          ],
        })}
        recruiterLabelsById={new Map()}
      />,
    )

    expect(screen.getByTestId("lavoratore-card-w-a")).toBeTruthy()
    expect(screen.getByTestId("lavoratore-card-w-b")).toBeTruthy()

    const searchInput = screen.getByPlaceholderText("Cerca candidato...")
    fireEvent.change(searchInput, { target: { value: "anna" } })

    expect(screen.getByTestId("lavoratore-card-w-a")).toBeTruthy()
    expect(screen.queryByTestId("lavoratore-card-w-b")).toBeNull()
  })

  it("shows only grouped column sections that contain cards", () => {
    renderWithProviders(
      <RicercaWorkersPipelineView
        processId="process-1"
        card={makeProcessCard()}
        pipelineState={makePipelineState({
          columns: [
            makeGroupedCandidatiColumn([
              makeSelectionCard({
                status: "Candidato - Good fit",
                worker: makePipelineWorker({ id: "w-good", nomeCompleto: "Good Fit" }),
              }),
            ]),
          ],
        })}
        recruiterLabelsById={new Map()}
      />,
    )

    expect(screen.getAllByText("Good fit").length).toBeGreaterThan(0)
    expect(screen.getByText("Good Fit")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Candidati" })).toBeTruthy()
  })
})
