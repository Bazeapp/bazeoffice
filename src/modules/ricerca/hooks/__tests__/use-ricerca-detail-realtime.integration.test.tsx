/**
 * Pattern B: ricerca detail sidebar reloads on process/family/address CDC
 * (reloadOpenDetail → silent loadRicercaDetailCard), without thrashing the
 * workers pipeline or showing a loading spinner.
 */
import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"
import { renderHookWithQueryClient } from "@/test/test-utils"

import { RICERCA_DETAIL_REALTIME_TABLES } from "../../lib/ricerca-detail-realtime"
import type { RicercaDetailCardData } from "../../lib/ricerca-detail-view.types"
import { useRicercaDetailView } from "../use-ricerca-detail-view"

const {
  mockLoadRicercaDetailCard,
  mockUseRealtimeBoardSync,
  mockUseRicercaWorkersPipeline,
} = vi.hoisted(() => ({
  mockLoadRicercaDetailCard: vi.fn(),
  mockUseRealtimeBoardSync: vi.fn(),
  mockUseRicercaWorkersPipeline: vi.fn(),
}))

vi.mock("../../lib/ricerca-detail-view.mappers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/ricerca-detail-view.mappers")>()
  return {
    ...actual,
    loadRicercaDetailCard: (...args: unknown[]) =>
      mockLoadRicercaDetailCard(...args),
  }
})

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: (...args: unknown[]) => mockUseRealtimeBoardSync(...args),
}))

vi.mock("../use-ricerca-workers-pipeline", () => ({
  useRicercaWorkersPipeline: (...args: unknown[]) =>
    mockUseRicercaWorkersPipeline(...args),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({ options: [], loading: false }),
}))

vi.mock("@/hooks/use-provincie", () => ({
  useProvincieOptions: () => [],
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

function makeCard(
  overrides: Partial<RicercaDetailCardData> = {},
): RicercaDetailCardData {
  return {
    id: "proc-1",
    famigliaId: "fam-1",
    nomeFamiglia: "Rossi",
    telefono: "111",
    email: "old@example.com",
    statoRes: "in_corso",
    indirizzoId: "addr-1",
    indirizzoVia: "Via Locale",
    ...overrides,
  } as RicercaDetailCardData
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

describe("useRicercaDetailView — Pattern B sidebar realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRealtimeBoardSync.mockImplementation(() => undefined)
    mockUseRicercaWorkersPipeline.mockReturnValue({
      columns: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      moveCard: vi.fn(),
    })
    mockLoadRicercaDetailCard.mockResolvedValue({
      card: makeCard(),
      lookupOptionsByField: {},
    })
  })

  it("subscribes to process/family/address tables and scopes open-detail reloads", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRicercaDetailView({
        processId: "proc-1",
        onBack: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.asyncState.loading).toBe(false)
      expect(result.current.card?.telefono).toBe("111")
      expect(mockUseRealtimeBoardSync).toHaveBeenCalled()
    })

    const syncOptions = getSyncOptions()
    expect(syncOptions.tables).toEqual([...RICERCA_DETAIL_REALTIME_TABLES])
    // Detail-owned subscription never reloads a board list.
    expect(syncOptions.shouldReloadBoard({} as RealtimeRowEvent)).toBe(false)

    const familyEvent: RealtimeRowEvent = {
      table: "famiglie",
      eventType: "UPDATE",
      newRow: { id: "fam-1", telefono: "333" },
      oldRow: { id: "fam-1", telefono: "111" },
    }
    const otherProcess: RealtimeRowEvent = {
      table: "processi_matching",
      eventType: "UPDATE",
      newRow: { id: "proc-other" },
      oldRow: { id: "proc-other" },
    }
    const addressEvent: RealtimeRowEvent = {
      table: "indirizzi",
      eventType: "UPDATE",
      newRow: {
        id: "addr-1",
        entita_id: "proc-1",
        entita_tabella: "processi_matching",
        via: "Via Nuova",
      },
      oldRow: {
        id: "addr-1",
        entita_id: "proc-1",
        entita_tabella: "processi_matching",
        via: "Via Locale",
      },
    }

    expect(syncOptions.shouldReloadOpenDetail(familyEvent)).toBe(true)
    expect(syncOptions.shouldReloadOpenDetail(addressEvent)).toBe(true)
    expect(syncOptions.shouldReloadOpenDetail(otherProcess)).toBe(false)
  })

  it("silently reloads sidebar card defaults on reloadOpenDetail", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRicercaDetailView({
        processId: "proc-1",
        onBack: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.asyncState.loading).toBe(false)
      expect(mockLoadRicercaDetailCard).toHaveBeenCalledTimes(1)
    })

    mockLoadRicercaDetailCard.mockResolvedValue({
      card: makeCard({
        telefono: "999",
        email: "new@example.com",
        indirizzoVia: "Via Remota",
      }),
      lookupOptionsByField: {},
    })

    const syncOptions = getSyncOptions()
    await act(async () => {
      syncOptions.reloadOpenDetail()
    })

    await waitFor(() => {
      expect(mockLoadRicercaDetailCard).toHaveBeenCalledTimes(2)
      expect(result.current.card?.telefono).toBe("999")
      expect(result.current.card?.email).toBe("new@example.com")
      expect(result.current.card?.indirizzoVia).toBe("Via Remota")
      // Silent reload must not flip the page into a loading state.
      expect(result.current.asyncState.loading).toBe(false)
    })

    // Pipeline hook stays independent (one mount call; no re-init storm).
    expect(mockUseRicercaWorkersPipeline).toHaveBeenCalledWith("proc-1")
  })

  it("keeps dirty sidebar fields while clean siblings take remote defaults", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRicercaDetailView({
        processId: "proc-1",
        onBack: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.form.getValues("telefono")).toBe("111")
      expect(result.current.form.getValues("email")).toBe("old@example.com")
    })

    await act(async () => {
      result.current.form.setValue("telefono", "local-dirty", {
        shouldDirty: true,
        shouldTouch: true,
      })
    })
    expect(result.current.form.getValues("telefono")).toBe("local-dirty")

    mockLoadRicercaDetailCard.mockResolvedValue({
      card: makeCard({
        telefono: "remote-phone",
        email: "remote@example.com",
      }),
      lookupOptionsByField: {},
    })

    const syncOptions = getSyncOptions()
    await act(async () => {
      syncOptions.reloadOpenDetail()
    })

    await waitFor(() => {
      expect(result.current.card?.telefono).toBe("remote-phone")
      expect(result.current.card?.email).toBe("remote@example.com")
      // Dirty key protected by useAutoSaveForm keepDirtyValues.
      expect(result.current.form.getValues("telefono")).toBe("local-dirty")
      expect(result.current.form.getValues("email")).toBe("remote@example.com")
    })
  })
})
