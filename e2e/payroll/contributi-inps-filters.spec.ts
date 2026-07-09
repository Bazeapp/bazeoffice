import { expect, test, type Page } from "@playwright/test"

import { E2E_CONTRIBUTI_INPS } from "../constants"
import {
  clearSearchQuery,
  ensureContributiInpsFixtureQuarter,
  expectContributiInpsCardVisibility,
  expectVisibleContributiInpsFixtureCount,
  getColumn,
  gotoContributiInps,
  resetFilters,
  setSearchQuery,
  setStageFilter,
} from "../support/contributi-inps"

test.describe("contributi-inps: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let contributiPage: Page
    const { daRichiedere, pagopaRicevuto, inviatoAllaFamiglia } =
      E2E_CONTRIBUTI_INPS.contributi

    test.beforeAll(async ({ browser }) => {
      contributiPage = await browser.newPage()
      await gotoContributiInps(contributiPage)
      await expectVisibleContributiInpsFixtureCount(contributiPage, 3)
    })

    test.afterAll(async () => {
      await contributiPage.close()
    })

    test.beforeEach(async () => {
      await resetFilters(contributiPage)
      await ensureContributiInpsFixtureQuarter(contributiPage)
      await expectVisibleContributiInpsFixtureCount(contributiPage, 3)
    })

    test("loads fixture cards across workflow columns", async () => {
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, true)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, true)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, true)
    })

    test("header shows title, contributo count and quarter switcher", async () => {
      await expect(
        contributiPage.getByRole("heading", { name: "Contributi INPS" }),
      ).toBeVisible()
      await expect(
        contributiPage.locator('[data-slot="section-header"]').getByText(/\d+ contribut/),
      ).toBeVisible()
      await expect(
        contributiPage.getByRole("button", { name: "Trimestre precedente" }),
      ).toBeVisible()
      await expect(
        contributiPage.getByRole("button", { name: "Trimestre successivo" }),
      ).toBeVisible()
      await expect(
        contributiPage
          .locator('[data-slot="section-header"]')
          .getByText(new RegExp(E2E_CONTRIBUTI_INPS.quarterLabel, "i")),
      ).toBeVisible()
    })

    test("renders payroll summary metrics", async () => {
      const metricsPanel = contributiPage.locator(".px-4.pt-4").first()
      for (const metricTitle of [
        "Rapporti attivi",
        "Contributi totali",
        "Da richiedere",
        "PagoPA ricevuto",
        "Inviato alla famiglia",
        "Pagato",
      ]) {
        await expect(metricsPanel.getByText(metricTitle, { exact: true })).toBeVisible()
      }
    })

    test("renders all contributi INPS workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_CONTRIBUTI_INPS.stages)) {
        await expect(getColumn(contributiPage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(contributiPage, pagopaRicevuto.famigliaSearchText)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, true)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, true)
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)

      await clearSearchQuery(contributiPage)
      await expectVisibleContributiInpsFixtureCount(contributiPage, 3)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(contributiPage, daRichiedere.lavoratoreSearchText)
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, true)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, false)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, false)
    })

    test("search narrows cards by importo label", async () => {
      await setSearchQuery(contributiPage, pagopaRicevuto.importoSearchText)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, true)
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, false)
    })

    test("search narrows cards by PagoPA amount", async () => {
      await setSearchQuery(contributiPage, inviatoAllaFamiglia.pagopaSearchText)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, true)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, false)
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(contributiPage, "zzzz-e2e-no-match")
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, false)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, false)
    })

    test("stage filter narrows cards to a single workflow column", async () => {
      await setStageFilter(contributiPage, E2E_CONTRIBUTI_INPS.stages.pagopaRicevuto)
      await expectContributiInpsCardVisibility(contributiPage, pagopaRicevuto.id, true)
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)
      await expectContributiInpsCardVisibility(contributiPage, inviatoAllaFamiglia.id, false)
    })

    test("reset filtri restores all fixture cards", async () => {
      await setSearchQuery(contributiPage, daRichiedere.lavoratoreSearchText)
      await setStageFilter(contributiPage, E2E_CONTRIBUTI_INPS.stages.daRichiedere)
      await contributiPage.getByRole("button", { name: "Reset filtri" }).click()
      await expectVisibleContributiInpsFixtureCount(contributiPage, 3)
    })

    test("quarter navigation away from fixture quarter hides fixtures", async () => {
      await contributiPage.getByRole("button", { name: "Trimestre precedente" }).click()
      await expectContributiInpsCardVisibility(contributiPage, daRichiedere.id, false)

      await ensureContributiInpsFixtureQuarter(contributiPage)
      await expectVisibleContributiInpsFixtureCount(contributiPage, 3)
    })
  })
})
