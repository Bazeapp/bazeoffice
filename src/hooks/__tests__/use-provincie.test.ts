import { describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"

import { useProvincieNameOptions, useProvincieOptions } from "../use-provincie"

vi.mock("@/lib/provincie-api", () => ({
  fetchProvincie: vi.fn().mockResolvedValue([
    { sigla: "MB", nome: "Monza e della Brianza", nome_inglese: null },
    { sigla: "MI", nome: "Milano", nome_inglese: null },
  ]),
}))

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client }, ui)
}

describe("useProvincieOptions", () => {
  it("BAZ-181: value is sigla and label is provincia nome", async () => {
    const { result } = renderHook(() => useProvincieOptions(), {
      wrapper: ({ children }) => wrap(children),
    })

    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0)
    })

    expect(result.current).toEqual(
      expect.arrayContaining([
        { value: "MB", label: "Monza e della Brianza" },
        { value: "MI", label: "Milano" },
      ]),
    )
    expect(result.current.every((opt) => opt.label !== opt.value)).toBe(true)
  })

  it("useProvincieNameOptions matches useProvincieOptions", async () => {
    const { result } = renderHook(
      () => ({
        options: useProvincieOptions(),
        nameOptions: useProvincieNameOptions(),
      }),
      { wrapper: ({ children }) => wrap(children) },
    )

    await waitFor(() => {
      expect(result.current.options.length).toBeGreaterThan(0)
    })

    expect(result.current.nameOptions).toEqual(result.current.options)
  })
})
