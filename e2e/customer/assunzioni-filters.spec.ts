import { expect, test, type Page } from "@playwright/test"

import { E2E_ASSUNZIONI } from "../constants"
import {
  clearSearchQuery,
  expectAssunzioniCardVisibility,
  expectVisibleAssunzioniFixtureCount,
  getColumn,
  gotoAssunzioni,
  setSearchQuery,
} from "../support/assunzioni"

test.describe("assunzioni: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let assunzioniPage: Page
    const { avviarePratica, inviataRichiestaDati, inAttesaDatiFamiglia } =
      E2E_ASSUNZIONI.rapporti

    test.beforeAll(async ({ browser }) => {
      assunzioniPage = await browser.newPage()
      await gotoAssunzioni(assunzioniPage)
      await expectVisibleAssunzioniFixtureCount(assunzioniPage, 3)
    })

    test.afterAll(async () => {
      await assunzioniPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(assunzioniPage)
      await expectVisibleAssunzioniFixtureCount(assunzioniPage, 3)
    })

    test("loads fixture cards across non-deferred columns", async () => {
      await expectAssunzioniCardVisibility(assunzioniPage, avviarePratica.id, true)
      await expectAssunzioniCardVisibility(assunzioniPage, inviataRichiestaDati.id, true)
      await expectAssunzioniCardVisibility(assunzioniPage, inAttesaDatiFamiglia.id, true)
    })

    test("header shows title, process count and external form links", async () => {
      await expect(
        assunzioniPage.getByRole("heading", { name: "Assunzioni" }),
      ).toBeVisible()
      await expect(
        assunzioniPage.locator('[data-slot="section-header"]').getByText(/\d+ processi/),
      ).toBeVisible()

      const famigliaForm = assunzioniPage.getByRole("link", {
        name: "Form assunzione famiglia",
      })
      const lavoratoreForm = assunzioniPage.getByRole("link", {
        name: "Form assunzione lavoratore",
      })
      await expect(famigliaForm).toHaveAttribute("href", /airtable\.com/)
      await expect(lavoratoreForm).toHaveAttribute("href", /airtable\.com/)
      await expect(famigliaForm).toHaveAttribute("target", "_blank")
    })

    test("renders all assunzioni workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_ASSUNZIONI.stages)) {
        await expect(getColumn(assunzioniPage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(assunzioniPage, inviataRichiestaDati.famigliaSearchText)
      await expectAssunzioniCardVisibility(assunzioniPage, inviataRichiestaDati.id, true)
      await expectAssunzioniCardVisibility(assunzioniPage, inAttesaDatiFamiglia.id, true)
      await expectAssunzioniCardVisibility(assunzioniPage, avviarePratica.id, false)

      await clearSearchQuery(assunzioniPage)
      await expectVisibleAssunzioniFixtureCount(assunzioniPage, 3)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(assunzioniPage, avviarePratica.lavoratoreSearchText)
      await expectAssunzioniCardVisibility(assunzioniPage, avviarePratica.id, true)
      await expectAssunzioniCardVisibility(assunzioniPage, inviataRichiestaDati.id, false)
      await expectAssunzioniCardVisibility(assunzioniPage, inAttesaDatiFamiglia.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(assunzioniPage, "zzzz-e2e-no-match")
      await expectAssunzioniCardVisibility(assunzioniPage, avviarePratica.id, false)
      await expectAssunzioniCardVisibility(assunzioniPage, inviataRichiestaDati.id, false)
      await expectAssunzioniCardVisibility(assunzioniPage, inAttesaDatiFamiglia.id, false)
    })

    test("deferred columns show load action before cards are fetched", async () => {
      const deferredColumn = getColumn(
        assunzioniPage,
        E2E_ASSUNZIONI.stages.contrattoFirmato,
      )
      await deferredColumn.scrollIntoViewIfNeeded()
      await expect(
        deferredColumn.getByRole("button", { name: "Carica processi" }),
      ).toBeVisible()
    })
  })
})
