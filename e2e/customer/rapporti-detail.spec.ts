import { expect, test } from "@playwright/test"

import { E2E_RAPPORTI, E2E_TICKET_CUSTOMER } from "../constants"
import {
  gotoRapporti,
  rapportoDetailHeading,
  rapportoDetailTab,
  selectRapportoCard,
  waitForRapportoDetail,
} from "../support/rapporti"

const SECTION_TABS = [
  "Contratto",
  "Preventivo",
  "Datore e Lavoratore",
  "Tickets",
  "Cedolini",
  "Contributi",
  "Variazioni",
  "Chiusure",
] as const

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

test.describe("rapporti lavorativi: detail panel", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  const { inAttivazione, attivo, terminato } = E2E_RAPPORTI.rapporti

  test("loads list with detail tabs and auto-selected rapporto", async ({ page }) => {
    await gotoRapporti(page)
    await waitForRapportoDetail(page)

    for (const tabLabel of SECTION_TABS) {
      await expect(rapportoDetailTab(page, tabLabel)).toBeVisible()
    }

    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible()
  })

  test("selecting a card updates the detail heading", async ({ page }) => {
    await gotoRapporti(page)
    await selectRapportoCard(page, attivo.id)

    await expect(
      rapportoDetailHeading(page, expectedRelationshipTitle(attivo.famigliaSearchText, attivo.lavoratoreSearchText)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(E2E_RAPPORTI.statoRapporto.attivo, { exact: true }).first()).toBeVisible()
  })

  test("deep link opens the requested rapporto detail", async ({ page }) => {
    await gotoRapporti(page, terminato.id)
    await waitForRapportoDetail(page)

    await expect(
      rapportoDetailHeading(
        page,
        expectedRelationshipTitle(terminato.famigliaSearchText, terminato.lavoratoreSearchText),
      ),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(E2E_RAPPORTI.statoRapporto.terminato, { exact: true }).first()).toBeVisible()
  })

  test("section tabs switch the active detail section", async ({ page }) => {
    await gotoRapporti(page, inAttivazione.id)
    await waitForRapportoDetail(page)

    await rapportoDetailTab(page, "Datore e Lavoratore").click()
    await expect(rapportoDetailTab(page, "Datore e Lavoratore")).toHaveAttribute(
      "data-state",
      "active",
    )
    await expect(page.getByText("Datore e lavoratore", { exact: true })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText("Datore", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Lavoratore", { exact: true }).first()).toBeVisible()

    await rapportoDetailTab(page, "Tickets").click()
    await expect(rapportoDetailTab(page, "Tickets")).toHaveAttribute("data-state", "active")
    await expect(
      page.getByText(E2E_TICKET_CUSTOMER.tickets.chiuso.causaleSearchText, { exact: false }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("contratto section shows rapporto metadata and edit affordance", async ({ page }) => {
    await gotoRapporti(page, inAttivazione.id)
    await waitForRapportoDetail(page)

    await expect(page.getByText("Caratteristiche del rapporto", { exact: true })).toBeVisible()
    await expect(page.getByText(`${inAttivazione.oreSettimanali}h/sett`).first()).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Modifica caratteristiche del rapporto" }),
    ).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoRapporti(page)
    await selectRapportoCard(page, inAttivazione.id)
    await expect(
      rapportoDetailHeading(
        page,
        expectedRelationshipTitle(
          inAttivazione.famigliaSearchText,
          inAttivazione.lavoratoreSearchText,
        ),
      ),
    ).toBeVisible({ timeout: 30_000 })

    await selectRapportoCard(page, attivo.id)
    await expect(
      rapportoDetailHeading(
        page,
        expectedRelationshipTitle(attivo.famigliaSearchText, attivo.lavoratoreSearchText),
      ),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailHeading(
        page,
        expectedRelationshipTitle(
          inAttivazione.famigliaSearchText,
          inAttivazione.lavoratoreSearchText,
        ),
      ),
    ).toHaveCount(0)
  })
})
