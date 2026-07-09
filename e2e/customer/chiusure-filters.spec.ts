import { expect, test, type Page } from "@playwright/test"

import { E2E_CHIUSURE } from "../constants"
import {
  clearSearchQuery,
  expectChiusureCardVisibility,
  expectVisibleChiusureFixtureCount,
  getColumn,
  gotoChiusure,
  openAnnullamentoDialog,
  setSearchQuery,
} from "../support/chiusure"

test.describe("chiusure: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let chiusurePage: Page
    const { dimissioni, licenziamento } = E2E_CHIUSURE.chiusure

    test.beforeAll(async ({ browser }) => {
      chiusurePage = await browser.newPage()
      await gotoChiusure(chiusurePage)
      await expectVisibleChiusureFixtureCount(chiusurePage, 2)
    })

    test.afterAll(async () => {
      await chiusurePage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(chiusurePage)
      await expectVisibleChiusureFixtureCount(chiusurePage, 2)
    })

    test("loads fixture cards in the first workflow columns", async () => {
      await expectChiusureCardVisibility(chiusurePage, dimissioni.id, true)
      await expectChiusureCardVisibility(chiusurePage, licenziamento.id, true)
    })

    test("header shows title, closure count and external form links", async () => {
      await expect(
        chiusurePage.getByRole("heading", { name: "Chiusure" }),
      ).toBeVisible()
      await expect(
        chiusurePage.locator('[data-slot="section-header"]').getByText(/\d+ chiusur/),
      ).toBeVisible()

      const licenziamentoForm = chiusurePage.getByRole("link", {
        name: "Apri un licenziamento",
      })
      const dimissioneForm = chiusurePage.getByRole("link", {
        name: "Apri una dimissione",
      })
      await expect(licenziamentoForm).toHaveAttribute("href", /airtable\.com/)
      await expect(dimissioneForm).toHaveAttribute("href", /airtable\.com/)
      await expect(licenziamentoForm).toHaveAttribute("target", "_blank")
    })

    test("renders all chiusure workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_CHIUSURE.stages)) {
        await expect(getColumn(chiusurePage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(chiusurePage, dimissioni.famigliaSearchText)
      await expectChiusureCardVisibility(chiusurePage, dimissioni.id, true)
      await expectChiusureCardVisibility(chiusurePage, licenziamento.id, false)

      await clearSearchQuery(chiusurePage)
      await expectVisibleChiusureFixtureCount(chiusurePage, 2)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(chiusurePage, licenziamento.lavoratoreSearchText)
      await expectChiusureCardVisibility(chiusurePage, licenziamento.id, true)
      await expectChiusureCardVisibility(chiusurePage, dimissioni.id, false)
    })

    test("search narrows cards by fixture email", async () => {
      await setSearchQuery(chiusurePage, dimissioni.emailSearchText)
      await expectChiusureCardVisibility(chiusurePage, dimissioni.id, true)
      await expectChiusureCardVisibility(chiusurePage, licenziamento.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(chiusurePage, "zzzz-e2e-no-match")
      await expectChiusureCardVisibility(chiusurePage, dimissioni.id, false)
      await expectChiusureCardVisibility(chiusurePage, licenziamento.id, false)
    })

    test("annullamento dialog opens with rapporto search and closes on cancel", async () => {
      const dialog = await openAnnullamentoDialog(chiusurePage)
      await expect(dialog.getByRole("heading", { name: "Apri un annullamento" })).toBeVisible()
      await expect(
        dialog.getByPlaceholder("Cerca per famiglia o lavoratore..."),
      ).toBeVisible()
      await dialog.getByRole("button", { name: "Annulla", exact: true }).click()
      await expect(chiusurePage.locator('[data-testid="chiusure-annullamento-dialog"]')).toHaveCount(
        0,
      )
    })
  })
})
