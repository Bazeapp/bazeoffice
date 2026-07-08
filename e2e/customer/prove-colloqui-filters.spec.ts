import { expect, test, type Page } from "@playwright/test"

import { E2E_PROVE_COLLOQUI } from "../constants"
import {
  clearSearchQuery,
  expectProveCardVisibility,
  expectVisibleProveFixtureCount,
  getColumn,
  gotoProveColloqui,
  setSearchQuery,
  switchToColloquiTab,
  switchToProveTab,
} from "../support/prove-colloqui"
import { selectors } from "../support/selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000

test.describe("prove-colloqui: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let provePage: Page
    const { chiamareFamiglia, chiamareLavoratore, inAttesaInizio } =
      E2E_PROVE_COLLOQUI.rapporti

    test.beforeAll(async ({ browser }) => {
      provePage = await browser.newPage()
      await gotoProveColloqui(provePage)
      await expectVisibleProveFixtureCount(provePage, 3)
    })

    test.afterAll(async () => {
      await provePage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(provePage)
      await switchToProveTab(provePage)
      await expectVisibleProveFixtureCount(provePage, 3)
    })

    test("loads fixture cards across workflow columns", async () => {
      await expectProveCardVisibility(provePage, chiamareFamiglia.id, true)
      await expectProveCardVisibility(provePage, chiamareLavoratore.id, true)
      await expectProveCardVisibility(provePage, inAttesaInizio.id, true)
    })

    test("header shows title, prove count and tab switcher", async () => {
      await expect(
        provePage.getByRole("heading", { name: selectors.proveColloqui.heading }),
      ).toBeVisible()
      await expect(
        provePage.locator('[data-slot="section-header"]').getByText(/\d+ prove/),
      ).toBeVisible()
      await expect(provePage.getByRole("tab", { name: "Prove" })).toBeVisible()
      await expect(provePage.getByRole("tab", { name: "Colloqui" })).toBeVisible()
    })

    test("renders primary prove workflow columns", async () => {
      for (const stageLabel of [
        E2E_PROVE_COLLOQUI.stages.chiamareFamigliaPreProva,
        E2E_PROVE_COLLOQUI.stages.chiamareLavoratorePreProva,
        E2E_PROVE_COLLOQUI.stages.inAttesaInizioProva,
      ]) {
        await expect(getColumn(provePage, stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(provePage, chiamareLavoratore.famigliaSearchText)
      await expectProveCardVisibility(provePage, chiamareLavoratore.id, true)
      await expectProveCardVisibility(provePage, chiamareFamiglia.id, true)
      await expectProveCardVisibility(provePage, inAttesaInizio.id, false)

      await clearSearchQuery(provePage)
      await expectVisibleProveFixtureCount(provePage, 3)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(provePage, inAttesaInizio.lavoratoreSearchText)
      await expectProveCardVisibility(provePage, inAttesaInizio.id, true)
      await expectProveCardVisibility(provePage, chiamareFamiglia.id, false)
      await expectProveCardVisibility(provePage, chiamareLavoratore.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(provePage, "zzzz-e2e-no-match")
      await expectProveCardVisibility(provePage, chiamareFamiglia.id, false)
      await expectProveCardVisibility(provePage, chiamareLavoratore.id, false)
      await expectProveCardVisibility(provePage, inAttesaInizio.id, false)
    })

    test("colloqui tab shows calendar controls and fixture events", async () => {
      await switchToColloquiTab(provePage)
      await expect(provePage.getByRole("button", { name: "Oggi" })).toBeVisible()
      await expect(
        provePage.locator(
          selectors.proveColloqui.calendarEvent(E2E_PROVE_COLLOQUI.colloqui.rossi.eventDomId),
        ),
      ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
      await expect(
        provePage.locator(
          selectors.proveColloqui.calendarEvent(E2E_PROVE_COLLOQUI.colloqui.bianchi.eventDomId),
        ),
      ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
    })
  })
})
