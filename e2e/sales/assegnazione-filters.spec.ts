import { expect, test, type Page } from "@playwright/test"

import { E2E_ASSEGNAZIONE } from "../constants"
import {
  E2E_ASSEGNAZIONE_FIXTURE_COUNT,
  expectAssegnazioneCardVisibility,
  expectVisibleAssegnazioneFixtureCount,
  gotoAssegnazione,
  processIdsByTipoRicerca,
  processIdsWithRecruiter,
  resetAssegnazioneFilters,
  setRecruiterFilter,
  setTipoRicercaFilter,
} from "../support/assegnazione"
import { selectors } from "../support/selectors"

test.describe("assegnazione: toolbar filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let assegnazionePage: Page

    test.beforeAll(async ({ browser }) => {
      assegnazionePage = await browser.newPage()
      await gotoAssegnazione(assegnazionePage)
      await expectVisibleAssegnazioneFixtureCount(
        assegnazionePage,
        E2E_ASSEGNAZIONE_FIXTURE_COUNT,
      )
    })

    test.afterAll(async () => {
      await assegnazionePage.close()
    })

    test.beforeEach(async () => {
      await resetAssegnazioneFilters(assegnazionePage)
    })

    test("loads board with all seeded fixture cards", async () => {
      await expectVisibleAssegnazioneFixtureCount(
        assegnazionePage,
        E2E_ASSEGNAZIONE_FIXTURE_COUNT,
      )
      await expect(
        assegnazionePage.getByRole("heading", { name: selectors.assegnazione.heading }),
      ).toBeVisible()
      await expectVisibleAssegnazioneFixtureCount(
        assegnazionePage,
        E2E_ASSEGNAZIONE_FIXTURE_COUNT,
      )
    })

    test("recruiter filter keeps only cards for the selected operator", async () => {
      await setRecruiterFilter(assegnazionePage, "recruiter")

      for (const processId of processIdsWithRecruiter("recruiter")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, true)
      }
      for (const processId of [
        E2E_ASSEGNAZIONE.processi.unassignedNuova.id,
        E2E_ASSEGNAZIONE.processi.unassignedSostituzione.id,
        E2E_ASSEGNAZIONE.processi.assignedTomorrow.id,
      ]) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, false)
      }
    })

    test("non assegnato filter keeps only cards without recruiter", async () => {
      await setRecruiterFilter(assegnazionePage, "none")

      for (const processId of processIdsWithRecruiter("none")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, true)
      }
      for (const processId of processIdsWithRecruiter("recruiter")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, false)
      }
    })

    test("tipo ricerca nuove filter keeps only new searches", async () => {
      await setTipoRicercaFilter(assegnazionePage, "nuova")

      for (const processId of processIdsByTipoRicerca("nuova")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, true)
      }
      for (const processId of processIdsByTipoRicerca("sostituzione")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, false)
      }
    })

    test("tipo ricerca sostituzioni filter keeps only replacements", async () => {
      await setTipoRicercaFilter(assegnazionePage, "sostituzione")

      for (const processId of processIdsByTipoRicerca("sostituzione")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, true)
      }
      for (const processId of processIdsByTipoRicerca("nuova")) {
        await expectAssegnazioneCardVisibility(assegnazionePage, processId, false)
      }
    })

    test("reset filtri restores the full board", async () => {
      await setRecruiterFilter(assegnazionePage, "recruiter")
      await setTipoRicercaFilter(assegnazionePage, "nuova")
      await expectVisibleAssegnazioneFixtureCount(assegnazionePage, 2)

      await resetAssegnazioneFilters(assegnazionePage)
      await expectVisibleAssegnazioneFixtureCount(
        assegnazionePage,
        E2E_ASSEGNAZIONE_FIXTURE_COUNT,
      )
    })
  })
})
