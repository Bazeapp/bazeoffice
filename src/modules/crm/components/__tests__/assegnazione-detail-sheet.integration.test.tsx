/**
 * Characterization: assegnazione "Stato e assegnazione" uses useAutoSaveForm
 * so clean fields resync while editing is enabled (R3). The previous
 * isEditingScheduling + schedulingDraft latch froze stato/date and only
 * half-merged recruiter from remote.
 */
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import type { AssegnazioneCardData } from "../../types"
import { AssegnazioneDetailSheet } from "../assegnazione-detail-sheet"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

function makeCard(
  overrides: Partial<AssegnazioneCardData> = {},
): AssegnazioneCardData {
  return {
    id: "process-1",
    famigliaId: "fam-1",
    nomeFamiglia: "Rossi Mario",
    email: "rossi@example.com",
    telefono: "3331234567",
    dataLead: "01/01/2026",
    deadlineMobile: "15/03/2026",
    deadlineSales: "15/03/2026",
    zona: "Milano",
    zonaQuartiere: null,
    zonaCap: null,
    zonaComune: "Milano",
    tipoLavoroBadge: "Colf",
    tipoLavoroColor: null,
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    dataAssegnazione: "2026-03-10",
    recruiterId: "op-1",
    statoRes: "da_assegnare",
    statoResLabel: "Da assegnare",
    oreSettimanali: "20",
    giorniSettimanali: "4",
    orarioDiLavoro: "9-13",
    disponibilitaColloquiInPresenza: "lun-ven",
    tipoRicerca: "nuova",
    overview: "-",
    ...overrides,
  }
}

const operators = [
  {
    id: "op-1",
    label: "Anna Recruiter",
    avatar: "AR",
    avatarBorderClassName: "after:border-emerald-500",
  },
  {
    id: "op-2",
    label: "Luca Recruiter",
    avatar: "LR",
    avatarBorderClassName: "after:border-sky-500",
  },
]

function setup(card: AssegnazioneCardData, onPatchCard = vi.fn(async () => {})) {
  const view = renderWithProviders(
    <AssegnazioneDetailSheet
      open
      onOpenChange={vi.fn()}
      card={card}
      operatorOptions={operators}
      onPatchCard={onPatchCard}
      onOpenRicerca={vi.fn()}
    />,
  )
  return { ...view, onPatchCard }
}

async function enableSchedulingEdit() {
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Modifica stato e assegnazione" }),
    )
  })
}

function schedulingSection() {
  return screen.getByText("Stato e assegnazione").closest("section")
    ?? screen.getByText("Stato e assegnazione").parentElement?.parentElement
}

function statoCombobox() {
  const section = schedulingSection()
  expect(section).toBeTruthy()
  const comboboxes = within(section as HTMLElement).getAllByRole("combobox")
  // Stato is the first select in the scheduling grid.
  return comboboxes[0]!
}

function dateInput(label: string) {
  const field = screen.getByText(label).closest("div")
  expect(field).toBeTruthy()
  const input = (field as HTMLElement).querySelector("input")
  expect(input).toBeTruthy()
  return input as HTMLInputElement
}

describe("AssegnazioneDetailSheet — edit-mode clean-field resync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates clean statoRes from remote card while editing is enabled", async () => {
    const card = makeCard({ statoRes: "da_assegnare", statoResLabel: "Da assegnare" })
    const { rerender, onPatchCard } = setup(card)

    await enableSchedulingEdit()
    expect(statoCombobox()).toHaveTextContent("Da assegnare")

    rerender(
      <AssegnazioneDetailSheet
        open
        onOpenChange={vi.fn()}
        card={makeCard({
          statoRes: "fare_ricerca",
          statoResLabel: "Fare ricerca",
        })}
        operatorOptions={operators}
        onPatchCard={onPatchCard}
        onOpenRicerca={vi.fn()}
      />,
    )

    expect(statoCombobox()).toHaveTextContent("Fare ricerca")
  })

  it("updates clean dataAssegnazione from remote while editing is enabled", async () => {
    const { rerender, onPatchCard } = setup(
      makeCard({ dataAssegnazione: "2026-03-10" }),
    )

    await enableSchedulingEdit()
    const input = dateInput("Data assegnazione")
    expect(input.value).toBe("2026-03-10")

    rerender(
      <AssegnazioneDetailSheet
        open
        onOpenChange={vi.fn()}
        card={makeCard({ dataAssegnazione: "2026-03-20" })}
        operatorOptions={operators}
        onPatchCard={onPatchCard}
        onOpenRicerca={vi.fn()}
      />,
    )

    expect(dateInput("Data assegnazione").value).toBe("2026-03-20")
  })

  it("applies peer statoRes when remote card changes (remote wins)", async () => {
    const { rerender, onPatchCard } = setup(
      makeCard({ statoRes: "da_assegnare", statoResLabel: "Da assegnare" }),
      vi.fn(async () => {}),
    )

    await enableSchedulingEdit()
    const stato = statoCombobox()

    await act(async () => {
      fireEvent.click(stato)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "Fare ricerca" }))
    })
    expect(statoCombobox()).toHaveTextContent("Fare ricerca")

    rerender(
      <AssegnazioneDetailSheet
        open
        onOpenChange={vi.fn()}
        card={makeCard({
          statoRes: "da_assegnare",
          statoResLabel: "Da assegnare",
          dataAssegnazione: "2026-04-01",
        })}
        operatorOptions={operators}
        onPatchCard={onPatchCard}
        onOpenRicerca={vi.fn()}
      />,
    )

    expect(statoCombobox()).toHaveTextContent("Da assegnare")
    expect(dateInput("Data assegnazione").value).toBe("2026-04-01")
  })

  it("after autosave, a previously dirty field accepts later remote defaults", async () => {
    const onPatchCard = vi.fn(async () => {})
    const { rerender } = setup(
      makeCard({ dataAssegnazione: "2026-03-10" }),
      onPatchCard,
    )

    await enableSchedulingEdit()
    const input = dateInput("Data assegnazione")

    await act(async () => {
      fireEvent.change(input, { target: { value: "2026-03-12" } })
    })

    await waitFor(
      () => {
        expect(onPatchCard).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )

    // Optimistic/server echo of our save (advances defaults signature).
    rerender(
      <AssegnazioneDetailSheet
        open
        onOpenChange={vi.fn()}
        card={makeCard({ dataAssegnazione: "2026-03-12" })}
        operatorOptions={operators}
        onPatchCard={onPatchCard}
        onOpenRicerca={vi.fn()}
      />,
    )
    expect(dateInput("Data assegnazione").value).toBe("2026-03-12")

    // Later peer remote change — must land because dirty cleared after save.
    rerender(
      <AssegnazioneDetailSheet
        open
        onOpenChange={vi.fn()}
        card={makeCard({ dataAssegnazione: "2026-03-25" })}
        operatorOptions={operators}
        onPatchCard={onPatchCard}
        onOpenRicerca={vi.fn()}
      />,
    )

    expect(dateInput("Data assegnazione").value).toBe("2026-03-25")
  })
})
