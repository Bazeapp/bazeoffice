import { expect, test, type Page } from "@playwright/test"

import { E2E_RAPPORTI } from "../constants"
import {
  clearSearchQuery,
  expectFixtureVisibilityForStatoRapporto,
  expectRapportoCardVisibility,
  expectVisibleRapportiFixtureCount,
  gotoRapporti,
  resetStatoRapportoFilter,
  setSearchQuery,
  setStatoRapportoFilter,
} from "../support/rapporti"

test.describe("rapporti lavorativi: list filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let rapportiPage: Page
    const { inAttivazione, attivo, terminato, errore } = E2E_RAPPORTI.rapporti

    test.beforeAll(async ({ browser }) => {
      rapportiPage = await browser.newPage()
      await gotoRapporti(rapportiPage)
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, true)
    })

    test.afterAll(async () => {
      await rapportiPage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(rapportiPage)
      await resetStatoRapportoFilter(rapportiPage)
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, true)
    })

    test("loads fixture cards in the list", async () => {
      await expectVisibleRapportiFixtureCount(rapportiPage, 4)
    })

    test("search narrows cards by family surname and clear restores fixtures", async () => {
      await setSearchQuery(rapportiPage, inAttivazione.famigliaSearchText)
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, true)
      await expectRapportoCardVisibility(rapportiPage, terminato.id, true)
      await expectRapportoCardVisibility(rapportiPage, attivo.id, false)

      await clearSearchQuery(rapportiPage)
      await expectVisibleRapportiFixtureCount(rapportiPage, 4)
    })

    test("search narrows cards by worker surname", async () => {
      await setSearchQuery(rapportiPage, terminato.lavoratoreSearchText)
      await expectRapportoCardVisibility(rapportiPage, terminato.id, true)
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, false)
      await expectRapportoCardVisibility(rapportiPage, attivo.id, false)
    })

    test("stato rapporto In attivazione filter keeps only matching fixtures", async () => {
      await setStatoRapportoFilter(rapportiPage, E2E_RAPPORTI.statoRapporto.inAttivazione)
      await expectFixtureVisibilityForStatoRapporto(
        rapportiPage,
        E2E_RAPPORTI.statoRapporto.inAttivazione,
      )
    })

    test("stato rapporto Attivo filter keeps only matching fixtures", async () => {
      await setStatoRapportoFilter(rapportiPage, E2E_RAPPORTI.statoRapporto.attivo)
      await expectFixtureVisibilityForStatoRapporto(rapportiPage, E2E_RAPPORTI.statoRapporto.attivo)
    })

    test("stato rapporto Terminato filter keeps only matching fixtures", async () => {
      await setStatoRapportoFilter(rapportiPage, E2E_RAPPORTI.statoRapporto.terminato)
      await expectFixtureVisibilityForStatoRapporto(
        rapportiPage,
        E2E_RAPPORTI.statoRapporto.terminato,
      )
    })

    test("stato rapporto Errore filter keeps only matching fixtures", async () => {
      await setStatoRapportoFilter(rapportiPage, E2E_RAPPORTI.statoRapporto.errore)
      await expectFixtureVisibilityForStatoRapporto(rapportiPage, E2E_RAPPORTI.statoRapporto.errore)
    })

    test("reset filtri clears stato rapporto filter", async () => {
      await setStatoRapportoFilter(rapportiPage, E2E_RAPPORTI.statoRapporto.attivo)
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, false)

      await resetStatoRapportoFilter(rapportiPage)
      await expectVisibleRapportiFixtureCount(rapportiPage, 4)
    })

    test("search with no matches shows empty state", async () => {
      await setSearchQuery(rapportiPage, "zzzz-e2e-no-match")
      await expect(rapportiPage.getByText("Nessun rapporto lavorativo trovato.")).toBeVisible()
      await expectRapportoCardVisibility(rapportiPage, inAttivazione.id, false)
    })
  })
})
