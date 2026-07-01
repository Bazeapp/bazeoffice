import { expect, test, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  clearSearchQuery,
  expectLavoratoreCardVisibility,
  gate1FixtureIds,
  gotoGate1,
  resetGateListFilters,
  setFollowupFilter,
  setProvinciaFilter,
  setSearchQuery,
} from "../support/lavoratori"
import { resetGate1Fixture } from "../support/lavoratori-mutations"

test.describe("gate 1: list filters", () => {
  test.describe.configure({ timeout: 90_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let gatePage: Page
    const { qualificatoMi, qualificatoTo } = E2E_LAVORATORI.lavoratori

    test.beforeAll(async ({ browser }) => {
      await resetGate1Fixture()
      gatePage = await browser.newPage()
      await gotoGate1(gatePage)
      for (const workerId of gate1FixtureIds()) {
        await expectLavoratoreCardVisibility(gatePage, workerId, true)
      }
    })

    test.afterAll(async () => {
      await gatePage.close()
    })

    test.beforeEach(async () => {
      await resetGateListFilters(gatePage)
      await clearSearchQuery(gatePage)
      for (const workerId of gate1FixtureIds()) {
        await expectLavoratoreCardVisibility(gatePage, workerId, true)
      }
    })

    test("loads booking links and gate 1 fixture cards", async () => {
      await expect(gatePage.getByRole("link", { name: "Colloquio Milano" })).toBeVisible()
      await expect(gatePage.getByRole("link", { name: "Colloquio Torino" })).toBeVisible()
      await expect(gatePage.getByRole("link", { name: "Colloquio Monza" })).toBeVisible()
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, true)
    })

    test("provincia filter keeps only workers in the selected province", async () => {
      await setProvinciaFilter(gatePage, E2E_LAVORATORI.province.torino)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)
    })

    test("follow-up filter keeps only matching workers", async () => {
      await setFollowupFilter(gatePage, E2E_LAVORATORI.followup.primaChiamata)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)
    })

    test("search narrows gate 1 cards by worker surname", async () => {
      await setSearchQuery(gatePage, qualificatoMi.searchText)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, false)
    })

    test("reset filtri restores gate 1 fixture cards after provincia filter", async () => {
      await setProvinciaFilter(gatePage, E2E_LAVORATORI.province.torino)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, false)

      await resetGateListFilters(gatePage)
      await expectLavoratoreCardVisibility(gatePage, qualificatoMi.id, true)
      await expectLavoratoreCardVisibility(gatePage, qualificatoTo.id, true)
    })
  })
})
