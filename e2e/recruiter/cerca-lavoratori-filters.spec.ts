import { expect, test, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  clearSearchQuery,
  expectLavoratoreCardVisibility,
  gotoCercaLavoratori,
  setSearchQuery,
} from "../support/lavoratori"

test.describe("cerca lavoratori: list filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("search", () => {
    test.describe.configure({ mode: "serial" })

    let cercaPage: Page
    const { qualificatoMi, qualificatoTo, nonQualificatoMi } = E2E_LAVORATORI.lavoratori

    test.beforeAll(async ({ browser }) => {
      cercaPage = await browser.newPage()
      await gotoCercaLavoratori(cercaPage)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, true)
    })

    test.afterAll(async () => {
      await cercaPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(cercaPage)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, true)
    })

    test("loads list with seeded fixture cards visible", async () => {
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, true)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoTo.id, true)
      await expectLavoratoreCardVisibility(cercaPage, nonQualificatoMi.id, true)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(cercaPage, qualificatoTo.searchText)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoTo.id, true)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, false)
    })

    test("search with no matches shows empty state", async () => {
      await setSearchQuery(cercaPage, "zzzz-e2e-no-match")
      await expect(cercaPage.getByText("Nessun lavoratore trovato.")).toBeVisible()
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, false)
    })

    test("clear search restores fixture cards", async () => {
      await setSearchQuery(cercaPage, qualificatoTo.searchText)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, false)

      await clearSearchQuery(cercaPage)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoMi.id, true)
      await expectLavoratoreCardVisibility(cercaPage, qualificatoTo.id, true)
    })
  })
})
