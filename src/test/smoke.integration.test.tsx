/**
 * Smoke test for the integration test infrastructure (FASE 1).
 *
 * Goal: verify jsdom + @testing-library/react + QueryClient wrapper all
 * work end-to-end. If this file goes red, no other hook/component test
 * can be trusted — fix this first.
 */
import * as React from "react"
import { describe, it, expect } from "vitest"
import { useQuery } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderHookWithQueryClient, renderWithProviders } from "./test-utils"

describe("test infrastructure — hook + QueryClient", () => {
  it("renderHookWithQueryClient resolves a useQuery", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useQuery({
        queryKey: ["smoke"],
        queryFn: async () => "ok",
      })
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toBe("ok")
  })

  it("each test gets a fresh QueryClient (no cache bleed)", async () => {
    const { result: a } = renderHookWithQueryClient(() =>
      useQuery({ queryKey: ["isolated"], queryFn: async () => "first" })
    )
    await waitFor(() => expect(a.current.isSuccess).toBe(true))

    const { result: b } = renderHookWithQueryClient(() =>
      useQuery({ queryKey: ["isolated"], queryFn: async () => "second" })
    )
    await waitFor(() => expect(b.current.isSuccess).toBe(true))
    expect(b.current.data).toBe("second")
  })
})

describe("test infrastructure — component + user-event", () => {
  function Counter() {
    const [count, setCount] = React.useState(0)
    return (
      <div>
        <span data-testid="count">{count}</span>
        <button onClick={() => setCount((n) => n + 1)}>increment</button>
      </div>
    )
  }

  it("renderWithProviders + user click updates the DOM", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Counter />)

    expect(screen.getByTestId("count")).toHaveTextContent("0")
    await user.click(screen.getByRole("button", { name: /increment/i }))
    expect(screen.getByTestId("count")).toHaveTextContent("1")
  })
})
