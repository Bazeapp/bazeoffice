import { expect, test } from "@playwright/test"

import { E2E_ASSUNZIONI, E2E_CHIUSURE, E2E_VARIAZIONI } from "../constants"
import { openCardSheet as openAssunzioneSheet, gotoAssunzioni } from "../support/assunzioni"
import { openCardSheet as openChiusuraSheet, gotoChiusure } from "../support/chiusure"
import { waitForRapportoDetail } from "../support/rapporti"
import { openCardSheet as openVariazioneSheet, gotoVariazioni } from "../support/variazioni"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

test.describe("gestione contrattuale: linked rapporto navigation", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test("assunzioni sheet navigates to rapporto detail", async ({ page }) => {
    const fixture = E2E_ASSUNZIONI.rapporti.avviarePratica
    await gotoAssunzioni(page)
    const dialog = await openAssunzioneSheet(page, fixture.id)
    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()

    await expect(page).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${fixture.id}`),
    )
    await waitForRapportoDetail(page)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(fixture.famigliaSearchText, fixture.lavoratoreSearchText),
      }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("chiusure sheet navigates to rapporto detail", async ({ page }) => {
    const fixture = E2E_CHIUSURE.chiusure.dimissioni
    await gotoChiusure(page)
    const dialog = await openChiusuraSheet(page, fixture.id)
    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()

    await expect(page).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${fixture.rapportoId}`),
    )
    await waitForRapportoDetail(page)
  })

  test("variazioni sheet navigates to rapporto detail", async ({ page }) => {
    const fixture = E2E_VARIAZIONI.variazioni.presaInCarico
    await gotoVariazioni(page)
    const dialog = await openVariazioneSheet(page, fixture.id)
    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()

    await expect(page).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${fixture.rapportoId}`),
    )
    await waitForRapportoDetail(page)
  })
})
