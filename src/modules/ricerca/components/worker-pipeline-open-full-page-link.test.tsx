/**
 * BAZ-91 — link from the ricerca scheda right column to Cerca Lavoratori.
 */
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import { WorkerPipelineOpenFullPageLink } from "./worker-pipeline-open-full-page-link"

describe("WorkerPipelineOpenFullPageLink", () => {
  it("renders the link and opens the full worker page with the worker id", () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <WorkerPipelineOpenFullPageLink workerId="worker-42" onOpen={onOpen} />,
    )

    fireEvent.click(screen.getByTestId("ricerca-worker-open-full-page"))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith("worker-42")
  })

  it("does not render when worker id is missing", () => {
    const onOpen = vi.fn()
    const { container } = renderWithProviders(
      <WorkerPipelineOpenFullPageLink workerId={null} onOpen={onOpen} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("ricerca-worker-open-full-page")).toBeNull()
  })

  it("does not render when worker id is blank", () => {
    renderWithProviders(
      <WorkerPipelineOpenFullPageLink workerId="   " onOpen={vi.fn()} />,
    )
    expect(screen.queryByTestId("ricerca-worker-open-full-page")).toBeNull()
  })
})
