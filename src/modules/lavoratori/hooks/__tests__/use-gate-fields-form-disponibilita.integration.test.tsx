/**
 * Gate 1 Disponibilita status must take peer/server updates when the field
 * is clean. A key↔label mismatch used to leave the field dirty forever so
 * keepDirtyValues blocked realtime resync.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Form } from "@/components/ui/form"
import { AvailabilityStatusCard } from "../../components/availability-status-card"
import { makeWorkerRow } from "../../components/__tests__/gate1-view-test-fixtures"
import { useGateFieldsForm } from "../use-gate-fields-form"
import type { LavoratoreRecord } from "../../types/lavoratore"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from "sonner"

const DISPONIBILITA_OPTIONS = [
  { label: "Disponibile", value: "disponibile" },
  { label: "Non disponibile", value: "non disponibile" },
]

const asyncNoop = async () => undefined

function Harness({ row }: { row: LavoratoreRecord }) {
  const lookupOptionsByDomain = new Map([
    ["lavoratori.disponibilita", DISPONIBILITA_OPTIONS],
  ])
  const noopSet = vi.fn()
  const formState = useGateFieldsForm({
    selectedWorkerId: row.id,
    selectedWorkerRow: row,
    selectedWorkerAddress: null,
    lookupOptionsByDomain,
    resolvedIban: "",
    setGateDraft: noopSet,
    setAvailabilityDraft: noopSet,
    setAddressDraft: noopSet,
    setJobSearchDraft: noopSet,
    setSkillsDraft: noopSet,
    setAvailabilityStatusDraft: noopSet,
    availabilityStatusDraft: {
      disponibilita: "",
      data_ritorno_disponibilita: "",
    },
    setDocumentsDraft: noopSet,
    patchSelectedWorkerField: asyncNoop,
    patchSkillsField: asyncNoop,
    patchWorkerAvailabilityStatus: asyncNoop,
    patchDocumentField: asyncNoop,
    commitAddressField: asyncNoop,
    patchWorkerAddressField: asyncNoop,
  })

  return (
    <Form {...formState.gateFieldsForm}>
      <AvailabilityStatusCard
        isEditing
        showEditAction={false}
        isUpdating={false}
        disponibilitaOptions={DISPONIBILITA_OPTIONS}
        selectedDisponibilitaBadgeClassName=""
        onToggleEdit={vi.fn()}
      />
      <output data-testid="disponibilita-value">
        {String(formState.gateFieldsForm.watch("disponibilita") ?? "")}
      </output>
    </Form>
  )
}

describe("useGateFieldsForm — disponibilita realtime resync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates clean disponibilita when selectedWorkerRow changes (peer CDC)", async () => {
    const { rerender } = render(
      <Harness row={makeWorkerRow({ id: "w1", disponibilita: "disponibile" })} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Disponibile",
      )
    })

    rerender(
      <Harness
        row={makeWorkerRow({ id: "w1", disponibilita: "non disponibile" })}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Non disponibile",
      )
    })
  })

  it("shows a return-date hint while Non disponibile is deferred without a date", async () => {
    render(
      <Harness row={makeWorkerRow({ id: "w1", disponibilita: "disponibile" })} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Disponibile",
      )
    })

    // Open the select and choose Non disponibile (RHF Select via trigger).
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await screen.findByRole("option", { name: "Non disponibile" }))

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-hint-data-ritorno")).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled()
    })
  })

  it("discards a deferred Non disponibile selection on worker switch", async () => {
    const { rerender } = render(
      <Harness row={makeWorkerRow({ id: "w1", disponibilita: "disponibile" })} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Disponibile",
      )
    })

    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await screen.findByRole("option", { name: "Non disponibile" }))

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Non disponibile",
      )
    })

    rerender(
      <Harness row={makeWorkerRow({ id: "w2", disponibilita: "disponibile" })} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("disponibilita-value")).toHaveTextContent(
        "Disponibile",
      )
    })
    expect(
      screen.queryByTestId("disponibilita-hint-data-ritorno"),
    ).not.toBeInTheDocument()
  })
})
