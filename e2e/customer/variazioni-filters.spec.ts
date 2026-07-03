import { expect, test, type Page } from "@playwright/test"

import { E2E_VARIAZIONI } from "../constants"
import {
  clearSearchQuery,
  expectVariazioniCardVisibility,
  expectVisibleVariazioniFixtureCount,
  getColumn,
  gotoVariazioni,
  openCreateDialog,
  setSearchQuery,
} from "../support/variazioni"

test.describe("variazioni: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let variazioniPage: Page
    const { presaInCarico, variazioneEffettuata } = E2E_VARIAZIONI.variazioni

    test.beforeAll(async ({ browser }) => {
      variazioniPage = await browser.newPage()
      await gotoVariazioni(variazioniPage)
      await expectVisibleVariazioniFixtureCount(variazioniPage, 2)
    })

    test.afterAll(async () => {
      await variazioniPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(variazioniPage)
      await expectVisibleVariazioniFixtureCount(variazioniPage, 2)
    })

    test("loads fixture cards in the first workflow columns", async () => {
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, true)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, true)
    })

    test("header shows title, variation count and create action", async () => {
      await expect(
        variazioniPage.getByRole("heading", { name: "Variazioni" }),
      ).toBeVisible()
      await expect(
        variazioniPage.locator('[data-slot="section-header"]').getByText(/\d+ variazion/),
      ).toBeVisible()
      await expect(
        variazioniPage.locator('[data-testid="variazioni-open-create"]'),
      ).toBeVisible()
    })

    test("renders all variazioni workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_VARIAZIONI.stages)) {
        await expect(getColumn(variazioniPage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(variazioniPage, presaInCarico.famigliaSearchText)
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, true)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, false)

      await clearSearchQuery(variazioniPage)
      await expectVisibleVariazioniFixtureCount(variazioniPage, 2)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(variazioniPage, variazioneEffettuata.lavoratoreSearchText)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, true)
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, false)
    })

    test("search narrows cards by variation description", async () => {
      await setSearchQuery(variazioniPage, presaInCarico.variazioneSearchText)
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, true)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, false)
    })

    test("search narrows cards by worker email", async () => {
      await setSearchQuery(variazioniPage, variazioneEffettuata.emailSearchText)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, true)
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(variazioniPage, "zzzz-e2e-no-match")
      await expectVariazioniCardVisibility(variazioniPage, presaInCarico.id, false)
      await expectVariazioniCardVisibility(variazioniPage, variazioneEffettuata.id, false)
    })

    test("create dialog opens with rapporto search and closes on cancel", async () => {
      const dialog = await openCreateDialog(variazioniPage)
      await expect(dialog.getByRole("heading", { name: "Apri una variazione" })).toBeVisible()
      await expect(
        dialog.getByPlaceholder("Cerca per famiglia o lavoratore..."),
      ).toBeVisible()
      await dialog.getByRole("button", { name: "Annulla", exact: true }).click()
      await expect(variazioniPage.locator('[data-testid="variazioni-create-dialog"]')).toHaveCount(
        0,
      )
    })
  })
})
