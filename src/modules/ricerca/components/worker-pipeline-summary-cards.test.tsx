/**
 * BAZ-25 — the compact "ricerche coinvolte" card (RelatedActiveSearchCard) shows
 * the worker's colloquio availability (giorni + orari) below the family's
 * requested schedule. Guard on the *trimmed* text: no row if both fields are
 * empty or absent.
 */
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import {
  RelatedActiveSearchCard,
  type RelatedActiveSearchItem,
} from "./worker-pipeline-summary-cards"

function makeItem(
  overrides: Partial<RelatedActiveSearchItem> = {},
): RelatedActiveSearchItem {
  return {
    selectionId: "s1",
    processId: "p1",
    familyName: "Rossi",
    ricercaLabel: "Ricerca",
    recruiterLabel: "Mario",
    statoSelezione: "attiva",
    statoRicerca: "attiva",
    orarioDiLavoro: "full time",
    zona: "Milano",
    appunti: "",
    ...overrides,
  }
}

const COLLOQUIO_RE = /Disponibilità colloquio/

describe("RelatedActiveSearchCard — riga disponibilità colloquio", () => {
  it("mostra giorni e orari del colloquio quando presenti", () => {
    renderWithProviders(
      <RelatedActiveSearchCard
        item={makeItem({
          workerColloquio: {
            giorni: "disponibile mercoledì",
            orario: "solo mattine",
          },
        })}
      />,
    )
    const row = screen.getByText(COLLOQUIO_RE)
    expect(row.textContent).toContain("disponibile mercoledì")
    expect(row.textContent).toContain("solo mattine")
    expect(row.textContent).toContain("·")
  })

  it("mostra solo il campo presente quando l'altro è vuoto/whitespace", () => {
    renderWithProviders(
      <RelatedActiveSearchCard
        item={makeItem({
          workerColloquio: { giorni: "disponibile mercoledì", orario: "  " },
        })}
      />,
    )
    const row = screen.getByText(COLLOQUIO_RE)
    expect(row.textContent).toContain("disponibile mercoledì")
    expect(row.textContent).not.toContain("·")
  })

  it("non mostra la riga quando entrambi i campi sono vuoti/whitespace", () => {
    renderWithProviders(
      <RelatedActiveSearchCard
        item={makeItem({ workerColloquio: { giorni: " ", orario: "" } })}
      />,
    )
    expect(screen.queryByText(COLLOQUIO_RE)).toBeNull()
  })

  it("non mostra la riga quando workerColloquio è assente", () => {
    renderWithProviders(<RelatedActiveSearchCard item={makeItem()} />)
    expect(screen.queryByText(COLLOQUIO_RE)).toBeNull()
  })
})
