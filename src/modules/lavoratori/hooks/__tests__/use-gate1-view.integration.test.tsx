/**
 * Primary test seam for gate1 orchestration (`useGate1View`).
 * Mocks data/editor hooks at the module boundary; exercises draft resync,
 * scroll section state, and worker identity switches.
 */
import { act } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import type { LavoratoreRecord } from "../../types/lavoratore"
import {
  makeEditorReturn,
  makeLavoratoriDataReturn,
  makeWorkerListItem,
  makeWorkerRow,
} from "../../components/__tests__/gate1-view-test-fixtures"

const { mockUseLavoratoriData, mockUseSelectedWorkerEditor } = vi.hoisted(() => ({
  mockUseLavoratoriData: vi.fn(),
  mockUseSelectedWorkerEditor: vi.fn(),
}))

vi.mock("../use-lavoratori-data", () => ({
  useLavoratoriData: (...args: unknown[]) => mockUseLavoratoriData(...args),
}))

vi.mock("../use-selected-worker-editor", () => ({
  useSelectedWorkerEditor: (...args: unknown[]) =>
    mockUseSelectedWorkerEditor(...args),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({ options: [], loading: false }),
}))

vi.mock("@/hooks/use-provincie", () => ({
  useProvincieOptions: () => [],
}))

vi.mock("@/hooks/use-current-operator-name", () => ({
  useCurrentOperatorName: () => "Test Operator",
}))

vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "x" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/x.jpg" } }),
      }),
    },
  },
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn().mockResolvedValue({ row: {} }),
  createRecord: vi.fn(),
  deleteRecord: vi.fn(),
}))

import { useGate1View } from "../use-gate1-view"
import { useGate1SectionNav } from "../use-gate1-section-nav"

function makeHookProps(
  row: LavoratoreRecord | null,
  workerId: string | null = row?.id ?? null,
) {
  const workerRow = row
  const listItem = workerRow ? makeWorkerListItem(workerRow) : null
  return {
    lavoratoriData: makeLavoratoriDataReturn(
      {
        selectedWorkerRow: workerRow,
        workerRows: workerRow ? [workerRow] : [],
      },
      {
        selectedWorkerId: workerId,
        workers: listItem ? [listItem] : [],
      },
    ),
    gateProps: {} as const,
  }
}

describe("useGate1View — gateDraft resync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSelectedWorkerEditor.mockImplementation(() => makeEditorReturn())
  })

  it("preserves in-progress gateDraft fields when selectedWorkerRow echoes from server", () => {
    const initialRow = makeWorkerRow({
      id: "w1",
      descrizione_pubblica: "Server descrizione",
      paga_oraria_richiesta: 9,
      feedback_recruiter: "ok",
      rating_atteggiamento: 3,
    })
    const setup = makeHookProps(initialRow, "w1")
    mockUseLavoratoriData.mockImplementation(() => setup.lavoratoriData)

    const { result, rerender } = renderHookWithQueryClient(() =>
      useGate1View(setup.gateProps),
    )

    expect(result.current.gateDraft.descrizionePubblica).toBe("Server descrizione")

    act(() => {
      result.current.setGateDraft((current) => ({
        ...current,
        descrizionePubblica: "User typed text in progress",
        pagaOrariaRichiesta: "11.5",
      }))
    })

    const echoedRow = makeWorkerRow({
      id: "w1",
      descrizione_pubblica: "Server descrizione",
      paga_oraria_richiesta: 9,
      feedback_recruiter: "feedback updated by colleague",
      rating_atteggiamento: 5,
    })
    const echoedSetup = makeHookProps(echoedRow, "w1")
    mockUseLavoratoriData.mockImplementation(() => echoedSetup.lavoratoriData)
    rerender()

    expect(result.current.gateDraft.descrizionePubblica).toBe(
      "User typed text in progress",
    )
    expect(result.current.gateDraft.pagaOrariaRichiesta).toBe("11.5")
    expect(result.current.gateDraft.assessmentFeedback).toBe(
      "feedback updated by colleague",
    )
    expect(result.current.gateDraft.ratingAtteggiamento).toBe("5")
  })

  it("resets gateDraft baseline when selectedWorkerId changes", () => {
    const firstRow = makeWorkerRow({
      id: "w1",
      descrizione_pubblica: "first worker text",
      paga_oraria_richiesta: 8,
      feedback_recruiter: "",
      rating_atteggiamento: null,
    })
    const firstSetup = makeHookProps(firstRow, "w1")
    mockUseLavoratoriData.mockImplementation(() => firstSetup.lavoratoriData)

    const { result, rerender } = renderHookWithQueryClient(() =>
      useGate1View(firstSetup.gateProps),
    )

    act(() => {
      result.current.setGateDraft((current) => ({
        ...current,
        descrizionePubblica: "dirty text on worker 1",
      }))
    })
    expect(result.current.gateDraft.descrizionePubblica).toBe("dirty text on worker 1")

    const secondRow = makeWorkerRow({
      id: "w2",
      descrizione_pubblica: "second worker server text",
      paga_oraria_richiesta: 12,
      feedback_recruiter: "feedback 2",
      rating_atteggiamento: 4,
    })
    const secondSetup = makeHookProps(secondRow, "w2")
    mockUseLavoratoriData.mockImplementation(() => secondSetup.lavoratoriData)
    rerender()

    expect(result.current.gateDraft.descrizionePubblica).toBe("second worker server text")
    expect(result.current.gateDraft.pagaOrariaRichiesta).toBe("12")
    expect(result.current.gateDraft.assessmentFeedback).toBe("feedback 2")
    expect(result.current.gateDraft.ratingAtteggiamento).toBe("4")
  })

  it("mutation-verify: would fail if resync guard always overwrote gateDraft", () => {
    const initialRow = makeWorkerRow({
      id: "w1",
      descrizione_pubblica: "Server descrizione",
    })
    const setup = makeHookProps(initialRow, "w1")
    mockUseLavoratoriData.mockImplementation(() => setup.lavoratoriData)

    const { result, rerender } = renderHookWithQueryClient(() =>
      useGate1View(setup.gateProps),
    )

    act(() => {
      result.current.setGateDraft((current) => ({
        ...current,
        descrizionePubblica: "User typed text in progress",
      }))
    })

    const echoedRow = makeWorkerRow({
      id: "w1",
      descrizione_pubblica: "Server overwrote this",
    })
    const echoedSetup = makeHookProps(echoedRow, "w1")
    mockUseLavoratoriData.mockImplementation(() => echoedSetup.lavoratoriData)
    rerender()

    // Guard must keep local edit when server echoes a different value.
    expect(result.current.gateDraft.descrizionePubblica).toBe(
      "User typed text in progress",
    )
  })
})

describe("useGate1SectionNav — scroll section", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates activeGateSection when scrollToSection is called", () => {
    const container = document.createElement("section")
    Object.defineProperty(container, "scrollTo", {
      value: vi.fn(),
      writable: true,
    })
    const target = document.createElement("div")
    Object.defineProperty(target, "offsetTop", { value: 240, configurable: true })

    const { result } = renderHookWithQueryClient(() =>
      useGate1SectionNav({
        showCertificationReferente: false,
        showFollowup: true,
        showDocumentSection: true,
        documentSectionAfterSpecificChecks: false,
        showAssessment: true,
        specificChecksMode: "gate1",
        useGate1ReorderedSteps: false,
        selectedWorkerId: "w1",
      }),
    )

    act(() => {
      result.current.detailScrollRef.current = container
      result.current.registerGateSectionRef("presentazione")(target)
    })

    expect(result.current.activeGateSection).toBe("contatti")

    act(() => {
      result.current.scrollToSection("presentazione")
    })

    expect(result.current.activeGateSection).toBe("presentazione")
    expect(container.scrollTo).toHaveBeenCalled()
  })
})
