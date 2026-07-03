import { expect, test, type Page } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  clearSearchQuery,
  ensureCedoliniFixtureMonth,
  expectCedoliniCardVisibility,
  expectVisibleCedoliniFixtureCount,
  getColumn,
  gotoCedolini,
  setSearchQuery,
} from "../support/cedolini"

test.describe("cedolini: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let cedoliniPage: Page
    const { todo, ricezionePresenze, inviatoCedolino } = E2E_CEDOLINI.cedolini

    test.beforeAll(async ({ browser }) => {
      cedoliniPage = await browser.newPage()
      await gotoCedolini(cedoliniPage)
      await expectVisibleCedoliniFixtureCount(cedoliniPage, 3)
    })

    test.afterAll(async () => {
      await cedoliniPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(cedoliniPage)
      await ensureCedoliniFixtureMonth(cedoliniPage)
      await expectVisibleCedoliniFixtureCount(cedoliniPage, 3)
    })

    test("loads fixture cards across workflow columns", async () => {
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, true)
    })

    test("header shows title, cedolino count and month switcher", async () => {
      await expect(
        cedoliniPage.getByRole("heading", { name: "Cedolini" }),
      ).toBeVisible()
      await expect(
        cedoliniPage.locator('[data-slot="section-header"]').getByText(/\d+ cedolin/),
      ).toBeVisible()
      await expect(
        cedoliniPage.getByRole("button", { name: "Mese precedente" }),
      ).toBeVisible()
      await expect(
        cedoliniPage.getByRole("button", { name: "Mese successivo" }),
      ).toBeVisible()
      await expect(
        cedoliniPage.getByText(new RegExp(E2E_CEDOLINI.monthLabel, "i")),
      ).toBeVisible()
    })

    test("renders payroll summary metrics", async () => {
      for (const metricTitle of [
        "Rapporti attivi",
        "Cedolini totali",
        "Presenze da raccogliere",
        "Presenze ricevute",
        "Inviati",
        "Pagati",
        "Da pagare",
      ]) {
        await expect(cedoliniPage.getByText(metricTitle, { exact: true })).toBeVisible()
      }
    })

    test("renders all cedolini workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_CEDOLINI.stages)) {
        await expect(getColumn(cedoliniPage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(cedoliniPage, ricezionePresenze.famigliaSearchText)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, false)

      await clearSearchQuery(cedoliniPage)
      await expectVisibleCedoliniFixtureCount(cedoliniPage, 3)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(cedoliniPage, todo.lavoratoreSearchText)
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, false)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, false)
    })

    test("search narrows cards by family email", async () => {
      await setSearchQuery(cedoliniPage, ricezionePresenze.famigliaEmailSearchText)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, false)
    })

    test("search narrows cards by importo label", async () => {
      await setSearchQuery(cedoliniPage, ricezionePresenze.importoSearchText)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, true)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, false)
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(cedoliniPage, "zzzz-e2e-no-match")
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, false)
      await expectCedoliniCardVisibility(cedoliniPage, ricezionePresenze.id, false)
      await expectCedoliniCardVisibility(cedoliniPage, inviatoCedolino.id, false)
    })

    test("month navigation away from fixture month hides fixtures", async () => {
      await cedoliniPage.getByRole("button", { name: "Mese precedente" }).click()
      await expectCedoliniCardVisibility(cedoliniPage, todo.id, false)

      await ensureCedoliniFixtureMonth(cedoliniPage)
      await expectVisibleCedoliniFixtureCount(cedoliniPage, 3)
    })
  })
})
