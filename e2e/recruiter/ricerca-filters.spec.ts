import { expect, test, type Page } from "@playwright/test"

import { E2E_RICERCA } from "../constants"
import {
  clearSearchQuery,
  E2E_RICERCA_FIXTURE_COUNT,
  expectRicercaCardVisibility,
  expectVisibleRicercaFixtureCount,
  gotoRicerca,
  processIdsWithRecruiter,
  reloadRicercaKeepingFilter,
  setRecruiterFilter,
  setSearchQuery,
} from "../support/ricerca"
import { selectors } from "../support/selectors"

test.describe("ricerca: toolbar filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let ricercaPage: Page

    test.beforeAll(async ({ browser }) => {
      ricercaPage = await browser.newPage()
      await gotoRicerca(ricercaPage)
      await expectVisibleRicercaFixtureCount(ricercaPage, E2E_RICERCA_FIXTURE_COUNT)
    })

    test.afterAll(async () => {
      await ricercaPage.close()
    })

    test.beforeEach(async () => {
      await setRecruiterFilter(ricercaPage, "all")
      await clearSearchQuery(ricercaPage)
      await expectVisibleRicercaFixtureCount(ricercaPage, E2E_RICERCA_FIXTURE_COUNT)
    })

    test("loads board with all seeded fixture cards", async () => {
      await expect(
        ricercaPage.getByRole("heading", { name: selectors.ricerca.heading }),
      ).toBeVisible()
      await expectVisibleRicercaFixtureCount(ricercaPage, E2E_RICERCA_FIXTURE_COUNT)
    })

    test("defaults recruiter filter to the logged-in operator when unset", async ({
      browser,
    }) => {
      const page = await browser.newPage()
      await page.addInitScript((storageKey: string) => {
        window.localStorage.removeItem(storageKey)
      }, "bazeoffice.ricercaBoard.recruiterFilter.v1")

      await page.goto(selectors.routes.ricerca)
      await expect(
        page.getByRole("heading", { name: selectors.ricerca.heading }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.locator(selectors.ricerca.filterRecruiter)).toContainText(
        E2E_RICERCA.operatori.recruiter.displayName,
        { timeout: 30_000 },
      )
      await page.close()
    })

    test("persists recruiter filter across board reloads", async ({ browser }) => {
      const page = await browser.newPage()
      await page.addInitScript((storageKey: string) => {
        window.localStorage.removeItem(storageKey)
      }, "bazeoffice.ricercaBoard.recruiterFilter.v1")

      await page.goto(selectors.routes.ricerca)
      await expect(page.locator(selectors.ricerca.filterRecruiter)).toBeVisible({
        timeout: 30_000,
      })
      await setRecruiterFilter(page, "all")
      await expect(page.locator(selectors.ricerca.filterRecruiter)).toContainText(
        "Tutti i recruiter",
      )

      await reloadRicercaKeepingFilter(page)
      await expect(page.locator(selectors.ricerca.filterRecruiter)).toContainText(
        "Tutti i recruiter",
        { timeout: 30_000 },
      )
      await page.close()
    })

    test("search narrows cards by family surname and clear restores the board", async () => {
      const { bianchi } = E2E_RICERCA.famiglie
      const { unassignedSostituzione, unassignedNuova } = E2E_RICERCA.processi

      await setSearchQuery(ricercaPage, bianchi)
      await expectRicercaCardVisibility(ricercaPage, unassignedSostituzione.id, true)
      await expectRicercaCardVisibility(ricercaPage, unassignedNuova.id, false)

      await clearSearchQuery(ricercaPage)
      await expectVisibleRicercaFixtureCount(ricercaPage, E2E_RICERCA_FIXTURE_COUNT)
    })

    test("recruiter filter keeps only cards for the selected operator", async () => {
      await setRecruiterFilter(ricercaPage, "recruiter")

      for (const processId of processIdsWithRecruiter("recruiter")) {
        await expectRicercaCardVisibility(ricercaPage, processId, true)
      }
      for (const processId of processIdsWithRecruiter("unassigned")) {
        await expectRicercaCardVisibility(ricercaPage, processId, false)
      }
      await expectRicercaCardVisibility(
        ricercaPage,
        E2E_RICERCA.processi.assignedTomorrow.id,
        false,
      )
    })

    test("senza recruiter filter keeps only unassigned cards", async () => {
      await setRecruiterFilter(ricercaPage, "unassigned")

      for (const processId of processIdsWithRecruiter("unassigned")) {
        await expectRicercaCardVisibility(ricercaPage, processId, true)
      }
      for (const processId of processIdsWithRecruiter("recruiter")) {
        await expectRicercaCardVisibility(ricercaPage, processId, false)
      }
      await expectRicercaCardVisibility(
        ricercaPage,
        E2E_RICERCA.processi.assignedTomorrow.id,
        false,
      )
    })

    test("search with no matches shows empty columns", async () => {
      await setSearchQuery(ricercaPage, "zzzz-e2e-no-match")
      await expect(ricercaPage.getByText("Nessuna ricerca").first()).toBeVisible()
      await expectVisibleRicercaFixtureCount(ricercaPage, 0)
    })

    test("combined recruiter and search filters intersect", async () => {
      await setRecruiterFilter(ricercaPage, "recruiter")
      await setSearchQuery(ricercaPage, E2E_RICERCA.famiglie.rossi)

      await expectRicercaCardVisibility(
        ricercaPage,
        E2E_RICERCA.processi.unassignedWithRecruiter.id,
        true,
      )
      await expectRicercaCardVisibility(
        ricercaPage,
        E2E_RICERCA.processi.assignedToday.id,
        true,
      )
      await expectRicercaCardVisibility(
        ricercaPage,
        E2E_RICERCA.processi.assignedTomorrow.id,
        false,
      )
    })
  })
})
