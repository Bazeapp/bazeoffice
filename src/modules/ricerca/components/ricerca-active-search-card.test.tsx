/**
 * BAZ-25 — the scheda lavoratore card shows the worker's colloquio availability
 * (giorni + orari) below the family's request. Rules: raw text, guard on the
 * *trimmed* text (not null), and the row appears ONLY when the `workerColloquio`
 * prop is passed (scheda context), never in the ricerca board where the prop is
 * absent.
 */
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import {
  RicercaActiveSearchCard,
  type WorkerColloquioAvailability,
} from "./ricerca-active-search-card"
import type { RicercaBoardCardData } from "../types"

function makeData(
  overrides: Partial<RicercaBoardCardData> = {},
): RicercaBoardCardData {
  return {
    id: "p1",
    stage: "attiva",
    nomeFamiglia: "Rossi",
    cognomeFamiglia: "",
    email: "-",
    telefono: "-",
    operatorId: null,
    oreSettimanali: "30",
    giorniSettimanali: "5",
    deadline: "-",
    deadlineRaw: null,
    zona: "Milano",
    tipoLavoroBadge: null,
    tipoLavoroColor: null,
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    ...overrides,
  }
}

const COLLOQUIO_RE = /Disponibilità colloquio/

describe("RicercaActiveSearchCard — riga disponibilità colloquio", () => {
  it("mostra giorni e orari del colloquio quando entrambi presenti", () => {
    const workerColloquio: WorkerColloquioAvailability = {
      giorni: "disponibile mercoledì",
      orario: "solo mattine",
    }
    renderWithProviders(
      <RicercaActiveSearchCard
        data={makeData()}
        workerColloquio={workerColloquio}
      />,
    )
    const row = screen.getByText(COLLOQUIO_RE)
    expect(row.textContent).toContain("disponibile mercoledì")
    expect(row.textContent).toContain("solo mattine")
    expect(row.textContent).toContain("·")
  })

  it("mostra solo il campo presente quando l'altro è vuoto/whitespace", () => {
    renderWithProviders(
      <RicercaActiveSearchCard
        data={makeData()}
        workerColloquio={{ giorni: "disponibile mercoledì", orario: "   " }}
      />,
    )
    const row = screen.getByText(COLLOQUIO_RE)
    expect(row.textContent).toContain("disponibile mercoledì")
    expect(row.textContent).not.toContain("·")
  })

  it("non mostra la riga quando entrambi i campi sono vuoti/whitespace", () => {
    renderWithProviders(
      <RicercaActiveSearchCard
        data={makeData()}
        workerColloquio={{ giorni: "   ", orario: "" }}
      />,
    )
    expect(screen.queryByText(COLLOQUIO_RE)).toBeNull()
  })

  it("non mostra la riga senza la prop workerColloquio (contesto board ricerca)", () => {
    renderWithProviders(<RicercaActiveSearchCard data={makeData()} />)
    expect(screen.queryByText(COLLOQUIO_RE)).toBeNull()
  })
})
