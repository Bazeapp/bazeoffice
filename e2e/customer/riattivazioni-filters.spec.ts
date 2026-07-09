import { expect, test, type Page } from "@playwright/test"

import { E2E_RIATTIVAZIONI } from "../constants"
import {
  clearSearchQuery,
  expectRiattivazioniCardVisibility,
  expectVisibleRiattivazioniFixtureCount,
  getColumn,
  gotoRiattivazioni,
  setSearchQuery,
} from "../support/riattivazioni"

test.describe("riattivazioni: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let riattivazioniPage: Page
    const { daSentire, inAttesa, ticketOrfana } = E2E_RIATTIVAZIONI.chiusure

    test.beforeAll(async ({ browser }) => {
      riattivazioniPage = await browser.newPage()
      await gotoRiattivazioni(riattivazioniPage)
      await expectVisibleRiattivazioniFixtureCount(riattivazioniPage, 2)
    })

    test.afterAll(async () => {
      await riattivazioniPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(riattivazioniPage)
      await expectVisibleRiattivazioniFixtureCount(riattivazioniPage, 2)
    })

    test("loads fixture cards in the first workflow columns", async () => {
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, true)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, true)
    })

    test("header shows title and closure count", async () => {
      await expect(
        riattivazioniPage.getByRole("heading", { name: "Riattivazioni" }),
      ).toBeVisible()
      await expect(
        riattivazioniPage.locator('[data-slot="section-header"]').getByText(/\d+ chiusur/),
      ).toBeVisible()
    })

    test("renders all riattivazioni workflow columns", async () => {
      for (const stageId of Object.values(E2E_RIATTIVAZIONI.stages)) {
        await expect(getColumn(riattivazioniPage, stageId)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(riattivazioniPage, daSentire.famigliaSearchText)
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, true)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, false)

      await clearSearchQuery(riattivazioniPage)
      await expectVisibleRiattivazioniFixtureCount(riattivazioniPage, 2)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(riattivazioniPage, inAttesa.lavoratoreSearchText)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, true)
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, false)
    })

    test("search narrows cards by fixture email", async () => {
      await setSearchQuery(riattivazioniPage, daSentire.emailSearchText)
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, true)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, false)
    })

    test("search narrows cards by motivazione", async () => {
      await setSearchQuery(riattivazioniPage, daSentire.motivazioneSearchText)
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, true)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(riattivazioniPage, "zzzz-e2e-no-match")
      await expectRiattivazioniCardVisibility(riattivazioniPage, daSentire.id, false)
      await expectRiattivazioniCardVisibility(riattivazioniPage, inAttesa.id, false)
    })

    test("ticket orphan fixture is visible in non riattiva column", async () => {
      const column = getColumn(riattivazioniPage, E2E_RIATTIVAZIONI.stages.nonRiattiva)
      await column.scrollIntoViewIfNeeded()
      await expect(
        column.locator(`[data-testid="riattivazioni-card-${ticketOrfana.id}"]`),
      ).toBeVisible({ timeout: 30_000 })
    })
  })
})
