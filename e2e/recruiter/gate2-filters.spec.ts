import { expect, test, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import { resetGate2IdoneoFixture } from "../support/lavoratori-mutations"
import {
  clearSearchQuery,
  expectLavoratoreCardVisibility,
  gate2IdoneiFixtureIds,
  gate2IdoneiQualificatiFixtureIds,
  gotoGate2,
  resetGateListFilters,
  setGate2StatusFilter,
  setProvinciaFilter,
  setSearchQuery,
} from "../support/lavoratori"

test.describe("gate 2: list filters", () => {
  test.describe.configure({ timeout: 90_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let gatePage: Page
    const { qualificatoMi, qualificatoTo, idoneoMi } = E2E_LAVORATORI.lavoratori

    test.beforeAll(async ({ browser }) => {
      await resetGate2IdoneoFixture()
      gatePage = await browser.newPage()
      await gotoGate2(gatePage)
    })

    test.afterAll(async () => {
      await gatePage.close()
    })

    test.beforeEach(async () => {
      await resetGateListFilters(gatePage)
      await clearSearchQuery(gatePage)
    })

    test("solo idonei shows only idoneo fixture cards", async () => {
      for (const workerId of gate2IdoneiFixtureIds()) {
        await expectLavoratoreCardVisibility(gatePage, workerId, true)
      }
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, false)
    })

    test("idonei + qualificati shows idoneo and qualificato fixtures", async () => {
      await setGate2StatusFilter(gatePage, "idonei_qualificati")

      for (const workerId of gate2IdoneiQualificatiFixtureIds()) {
        await expectLavoratoreCardVisibility(gatePage, workerId, true)
      }
    })

    test("provincia filter narrows gate 2 cards", async () => {
      await setGate2StatusFilter(gatePage, "idonei_qualificati")
      await setProvinciaFilter(gatePage, E2E_LAVORATORI.province.torino)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)
      await expectLavoratoreCardVisibility(gatePage, idoneoMi.id, false)
    })

    test("search narrows gate 2 cards by worker surname", async () => {
      await setSearchQuery(gatePage, idoneoMi.searchText)
      await expectLavoratoreCardVisibility(gatePage, idoneoMi.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)
    })

    test("search with no matches shows empty state", async () => {
      await setSearchQuery(gatePage, "zzzz-e2e-no-match")
      await expect(gatePage.getByText("Nessun lavoratore trovato.")).toBeVisible()
      await expectLavoratoreCardVisibility(gatePage, idoneoMi.id, false)
    })
  })
})
