import { act, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"

import {
  CRM_PIPELINE_SALES_FILTER_ALL,
  CRM_PIPELINE_SALES_FILTER_STORAGE_KEY,
  CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
} from "../lib/crm-pipeline-sales-filter"

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: vi.fn(),
}))
vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: vi.fn(),
}))
vi.mock("@/modules/commenti/queries", () => ({
  fetchCurrentOperatorId: vi.fn(),
}))

import { useAuthSession } from "@/hooks/use-auth-session"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { fetchCurrentOperatorId } from "@/modules/commenti/queries"
import { useCrmPipelineSalesFilter } from "./use-crm-pipeline-sales-filter"

const OPERATORS = [
  {
    id: "op-self",
    label: "Sales Self",
    avatar: "SS",
    avatarBorderClassName: "after:border-emerald-500",
  },
  {
    id: "op-other",
    label: "Sales Other",
    avatar: "SO",
    avatarBorderClassName: "after:border-sky-500",
  },
] as const

describe("useCrmPipelineSalesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.removeItem(CRM_PIPELINE_SALES_FILTER_STORAGE_KEY)
    vi.mocked(useAuthSession).mockReturnValue({
      session: { user: { id: "auth-1" } },
      loading: false,
    } as never)
    vi.mocked(useOperatoriOptions).mockReturnValue({
      options: [...OPERATORS],
      loading: false,
      error: null,
    } as never)
    vi.mocked(fetchCurrentOperatorId).mockResolvedValue("op-self")
  })

  afterEach(() => {
    window.localStorage.removeItem(CRM_PIPELINE_SALES_FILTER_STORAGE_KEY)
  })

  it("defaults to the logged-in sales operator once options and auth settle", async () => {
    const { result } = renderHookWithQueryClient(() => useCrmPipelineSalesFilter())

    await waitFor(() =>
      expect(result.current.selectedSalesFilter).toBe("op-self"),
    )
    expect(result.current.salesServerFilter).toEqual({
      salesOperatorId: "op-self",
      salesUnassigned: null,
    })
  })

  it("keeps a persisted special filter across auth/options loading", async () => {
    window.localStorage.setItem(
      CRM_PIPELINE_SALES_FILTER_STORAGE_KEY,
      CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
    )

    const { result } = renderHookWithQueryClient(() => useCrmPipelineSalesFilter())

    await waitFor(() =>
      expect(result.current.selectedSalesFilter).toBe(
        CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
      ),
    )
    expect(result.current.salesServerFilter).toEqual({
      salesOperatorId: null,
      salesUnassigned: true,
    })
  })

  it("does not overwrite a manual selection once the current-operator query settles", async () => {
    let resolveOperatorId!: (value: string) => void
    vi.mocked(fetchCurrentOperatorId).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveOperatorId = resolve
      }),
    )

    const { result } = renderHookWithQueryClient(() => useCrmPipelineSalesFilter())

    act(() => {
      result.current.setSelectedSalesFilter(CRM_PIPELINE_SALES_FILTER_ALL)
    })
    expect(result.current.selectedSalesFilter).toBe(CRM_PIPELINE_SALES_FILTER_ALL)

    await act(async () => {
      resolveOperatorId("op-self")
    })

    await waitFor(() =>
      expect(result.current.selectedSalesFilter).toBe(
        CRM_PIPELINE_SALES_FILTER_ALL,
      ),
    )
  })
})
