/**
 * Pattern B: open ricerca worker overlay reloads scheda sections on CDC
 * (reloadOpenDetail → silent fetchRicercaWorkerScheda), without re-showing
 * the "Caricamento profilo..." toast or touching the kanban board.
 */
import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"
import { makeWorkerRow } from "@/modules/lavoratori/components/__tests__/gate1-view-test-fixtures"
import { LAVORATORI_REALTIME_TABLES } from "@/modules/lavoratori/lib"
import { renderHookWithQueryClient } from "@/test/test-utils"

import {
  makeProcessCard,
  makeSelectionCard,
} from "../../components/__tests__/ricerca-workers-pipeline-view-test-fixtures"
import { useRicercaWorkerPipelineOverlay } from "../use-ricerca-worker-pipeline-overlay"

const {
  mockFetchRicercaWorkerScheda,
  mockFetchLookupValues,
  mockFetchAllSelectionsForWorker,
  mockUseRealtimeBoardSync,
  mockToastLoading,
} = vi.hoisted(() => ({
  mockFetchRicercaWorkerScheda: vi.fn(),
  mockFetchLookupValues: vi.fn(),
  mockFetchAllSelectionsForWorker: vi.fn(),
  mockUseRealtimeBoardSync: vi.fn(),
  mockToastLoading: vi.fn(),
}))

vi.mock("../../queries/fetch-ricerca-worker-scheda", () => ({
  fetchRicercaWorkerScheda: (...args: unknown[]) =>
    mockFetchRicercaWorkerScheda(...args),
}))

vi.mock("@/lib/lookup-values", () => ({
  fetchLookupValues: (...args: unknown[]) => mockFetchLookupValues(...args),
}))

vi.mock("../../lib/worker-pipeline-view-data", () => ({
  fetchAllSelectionsForWorker: (...args: unknown[]) =>
    mockFetchAllSelectionsForWorker(...args),
}))

vi.mock("../../lib/related-active-searches", () => ({
  buildRelatedSearchGroups: () => ({ direct: [], other: [] }),
  fetchRelatedSearchLookupMaps: vi.fn(async () => ({
    processRowsById: new Map(),
    familyRowsById: new Map(),
  })),
  toWorkerOtherSelectionSummaryItems: () => [],
}))

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: (...args: unknown[]) => mockUseRealtimeBoardSync(...args),
}))

const editorStub = {
  availabilityPayload: null,
  availabilityReadOnlyRows: [],
  isEditingAvailability: false,
  setIsEditingAvailability: vi.fn(),
  isEditingJobSearch: false,
  setIsEditingJobSearch: vi.fn(),
  isEditingExperience: false,
  setIsEditingExperience: vi.fn(),
  isEditingSkills: false,
  setIsEditingSkills: vi.fn(),
  isEditingDocuments: false,
  setIsEditingDocuments: vi.fn(),
  updatingAvailability: false,
  updatingJobSearch: false,
  updatingExperience: false,
  updatingSkills: false,
  updatingDocuments: false,
  availabilityDraft: {},
  setAvailabilityDraft: vi.fn(),
  jobSearchDraft: {},
  setJobSearchDraft: vi.fn(),
  experienceDraft: {},
  setExperienceDraft: vi.fn(),
  skillsDraft: {},
  setSkillsDraft: vi.fn(),
  documentsDraft: {},
  setDocumentsDraft: vi.fn(),
  resolvedIban: "",
  handleAvailabilityMatrixChange: vi.fn(),
  saveWorkerAvailability: vi.fn(),
  patchJobSearchField: vi.fn(),
  patchExperienceRecord: vi.fn(),
  createExperienceRecord: vi.fn(),
  deleteExperienceRecord: vi.fn(),
  patchReferenceRecord: vi.fn(),
  createReferenceRecord: vi.fn(),
  patchSkillsField: vi.fn(),
  patchDocumentField: vi.fn(),
  patchSelectedWorkerField: vi.fn(),
  patchWorkerAddressField: vi.fn(),
}

vi.mock("@/modules/lavoratori/hooks", () => ({
  useSelectedWorkerEditor: () => editorStub,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: (...args: unknown[]) => mockToastLoading(...args),
    dismiss: vi.fn(),
  },
}))

function makeScheda(overrides: {
  worker?: ReturnType<typeof makeWorkerRow>
  esperienze?: Array<{ id: string; lavoratore_id: string }>
} = {}) {
  const worker = overrides.worker ?? makeWorkerRow({ id: "worker-1" })
  return {
    worker,
    selezione: { id: "sel-1", lavoratore_id: worker.id },
    indirizzi: [
      {
        id: "addr-1",
        entita_id: worker.id,
        entita_tabella: "lavoratori",
        tipo_indirizzo: "residenza",
        via: "Via Locale",
        citta: "Milano",
      },
    ],
    esperienze: overrides.esperienze ?? [
      { id: "exp-1", lavoratore_id: worker.id },
    ],
    documenti: [{ id: "doc-1", lavoratore_id: worker.id }],
    referenze: [],
  }
}

function getSyncOptions() {
  return mockUseRealtimeBoardSync.mock.calls.at(-1)?.[0] as {
    tables: string[]
    shouldReloadBoard: (event: RealtimeRowEvent) => boolean
    shouldReloadOpenDetail: (event: RealtimeRowEvent) => boolean
    reloadOpenDetail: () => void
    reload: () => void
  }
}

const STABLE_RECRUITER_LABELS = new Map<string, string>()
const STABLE_PROCESS_CARD = makeProcessCard({ id: "proc-1" })
const STABLE_MOVE_CARD = vi.fn()

function renderOverlayHook() {
  return renderHookWithQueryClient(() =>
    useRicercaWorkerPipelineOverlay({
      processId: "proc-1",
      card: STABLE_PROCESS_CARD,
      columns: [],
      loading: false,
      moveCard: STABLE_MOVE_CARD,
      recruiterLabelsById: STABLE_RECRUITER_LABELS,
    }),
  )
}

describe("useRicercaWorkerPipelineOverlay — Pattern B scheda realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRealtimeBoardSync.mockImplementation(() => undefined)
    mockFetchLookupValues.mockResolvedValue({ rows: [] })
    mockFetchAllSelectionsForWorker.mockResolvedValue([])
    mockFetchRicercaWorkerScheda.mockResolvedValue(makeScheda())
    mockToastLoading.mockReturnValue("toast-1")
  })

  it("subscribes to worker scheda tables and scopes open-detail reloads", async () => {
    const selection = makeSelectionCard({ id: "sel-1" })
    const { result } = renderOverlayHook()

    await act(async () => {
      result.current.handleOpenWorker(selection)
    })

    await waitFor(() => {
      expect(result.current.overlayProps.selectedWorkerRow?.id).toBe("worker-1")
      expect(mockUseRealtimeBoardSync).toHaveBeenCalled()
    })

    const syncOptions = getSyncOptions()
    expect(syncOptions.tables).toEqual([...LAVORATORI_REALTIME_TABLES])
    expect(syncOptions.shouldReloadBoard({} as RealtimeRowEvent)).toBe(false)

    const workerEvent: RealtimeRowEvent = {
      table: "lavoratori",
      eventType: "UPDATE",
      newRow: { id: "worker-1", telefono: "999" },
      oldRow: { id: "worker-1", telefono: "111" },
    }
    const experienceEvent: RealtimeRowEvent = {
      table: "esperienze_lavoratori",
      eventType: "UPDATE",
      newRow: { id: "exp-1", lavoratore_id: "worker-1" },
      oldRow: { id: "exp-1", lavoratore_id: "worker-1" },
    }
    const otherWorker: RealtimeRowEvent = {
      table: "lavoratori",
      eventType: "UPDATE",
      newRow: { id: "worker-other" },
      oldRow: { id: "worker-other" },
    }

    expect(syncOptions.shouldReloadOpenDetail(workerEvent)).toBe(true)
    expect(syncOptions.shouldReloadOpenDetail(experienceEvent)).toBe(true)
    expect(syncOptions.shouldReloadOpenDetail(otherWorker)).toBe(false)
  })

  it("silently reloads overlay sections on reloadOpenDetail", async () => {
    const selection = makeSelectionCard({ id: "sel-1" })
    const { result } = renderOverlayHook()

    await act(async () => {
      result.current.handleOpenWorker(selection)
    })

    await waitFor(() => {
      expect(result.current.overlayProps.selectedWorkerRow?.telefono).toBe(
        "3331234567",
      )
      expect(result.current.overlayProps.selectedWorkerExperiences).toHaveLength(
        1,
      )
      expect(mockFetchRicercaWorkerScheda).toHaveBeenCalledTimes(1)
    })

    const loadingToastCallsAfterOpen = mockToastLoading.mock.calls.length

    mockFetchRicercaWorkerScheda.mockResolvedValue(
      makeScheda({
        worker: makeWorkerRow({
          id: "worker-1",
          telefono: "999888777",
          nome: "Maria",
          cognome: "Remota",
        }),
        esperienze: [
          { id: "exp-1", lavoratore_id: "worker-1" },
          { id: "exp-2", lavoratore_id: "worker-1" },
        ],
      }),
    )

    const syncOptions = getSyncOptions()
    await act(async () => {
      syncOptions.reloadOpenDetail()
    })

    await waitFor(() => {
      expect(mockFetchRicercaWorkerScheda).toHaveBeenCalledTimes(2)
      expect(result.current.overlayProps.selectedWorkerRow?.telefono).toBe(
        "999888777",
      )
      expect(result.current.overlayProps.selectedWorker?.nomeCompleto).toBe(
        "Maria Remota",
      )
      expect(result.current.overlayProps.selectedWorkerExperiences).toHaveLength(
        2,
      )
      expect(result.current.overlayProps.loadingSelectedWorkerExperiences).toBe(
        false,
      )
    })

    expect(mockToastLoading.mock.calls.length).toBe(loadingToastCallsAfterOpen)
  })

  it("does not reload open detail when overlay is closed", async () => {
    renderOverlayHook()

    await waitFor(() => {
      expect(mockUseRealtimeBoardSync).toHaveBeenCalled()
    })

    const syncOptions = getSyncOptions()
    const workerEvent: RealtimeRowEvent = {
      table: "lavoratori",
      eventType: "UPDATE",
      newRow: { id: "worker-1" },
      oldRow: { id: "worker-1" },
    }

    expect(syncOptions.shouldReloadOpenDetail(workerEvent)).toBe(false)

    await act(async () => {
      syncOptions.reloadOpenDetail()
    })

    expect(mockFetchRicercaWorkerScheda).not.toHaveBeenCalled()
  })
})
