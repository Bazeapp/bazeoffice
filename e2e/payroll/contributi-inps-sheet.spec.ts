import { expect, test, type Page } from "@playwright/test"

import { E2E_CONTRIBUTI_INPS } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoContributiInps,
  openCardSheet,
  waitForContributoInpsDetail,
} from "../support/contributi-inps"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { daRichiedere, pagopaRicevuto, inviatoAllaFamiglia } =
  E2E_CONTRIBUTI_INPS.contributi

test.describe("contributi-inps: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  let contributiPage: Page

  test.beforeAll(async ({ browser }) => {
    contributiPage = await browser.newPage()
    await gotoContributiInps(contributiPage)
  })

  test.afterAll(async () => {
    await contributiPage.close()
  })

  test("pagopa ricevuto sheet shows sections, fields, then closes", async () => {
    const dialog = await openCardSheet(contributiPage, pagopaRicevuto.id)
    await waitForContributoInpsDetail(contributiPage)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          pagopaRicevuto.famigliaSearchText,
          pagopaRicevuto.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    for (const label of [
      "Contributo INPS",
      "Allegato",
      "Stato contributo",
      "Trimestre",
      "Importo contributo INPS",
      "Valore PagoPA",
      "Data invio famiglia",
      "Creato il",
      "Importo attuale",
      "PagoPA attuale",
      "Allegato PagoPA",
    ]) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible()
    }

    await closeCardSheet(contributiPage)
    await expect(contributiPage.locator(selectors.contributiInps.sheetDialog)).toHaveCount(0)
  })

  test("da richiedere sheet shows header, rapporto summary and stato", async () => {
    const dialog = await openCardSheet(contributiPage, daRichiedere.id)
    await waitForContributoInpsDetail(contributiPage)

    await expect(
      dialog.getByText(E2E_CONTRIBUTI_INPS.quarterLabel, { exact: true }).first(),
    ).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toContainText(
      E2E_CONTRIBUTI_INPS.stages.daRichiedere,
    )
    await expect(dialog.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Vai al rapporto" })).toBeVisible()
    // "Tipo" (tipo_rapporto) rimosso dalla card: campo deprecato.
    await expect(dialog.getByText("Tipo", { exact: true })).toHaveCount(0)
    await expect(dialog.getByText("Ore sett.", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Inizio", { exact: true })).toBeVisible()

    await closeCardSheet(contributiPage)
  })

  test("linked rapporto navigation opens rapporto detail page", async () => {
    const dialog = await openCardSheet(contributiPage, daRichiedere.id)
    await waitForContributoInpsDetail(contributiPage)

    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()
    await expect(contributiPage).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${daRichiedere.rapportoId}`),
    )
    await expect(
      contributiPage.getByRole("tab", { name: "Contratto", exact: true }),
    ).toBeVisible({ timeout: 30_000 })

    await gotoContributiInps(contributiPage)
  })

  test("switching cards remounts detail without stale heading", async () => {
    await openCardSheet(contributiPage, daRichiedere.id)
    await waitForContributoInpsDetail(contributiPage)
    await expect(
      contributiPage.getByRole("heading", {
        name: expectedRelationshipTitle(
          daRichiedere.famigliaSearchText,
          daRichiedere.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(contributiPage)
    await openCardSheet(contributiPage, inviatoAllaFamiglia.id)
    await waitForContributoInpsDetail(contributiPage)
    await expect(
      contributiPage.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviatoAllaFamiglia.famigliaSearchText,
          inviatoAllaFamiglia.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      contributiPage.getByRole("heading", {
        name: expectedRelationshipTitle(
          daRichiedere.famigliaSearchText,
          daRichiedere.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)

    await closeCardSheet(contributiPage)
  })

  test("inviato alla famiglia fixture is reachable in the far-right populated column", async () => {
    const column = getColumn(contributiPage, E2E_CONTRIBUTI_INPS.stages.inviatoAllaFamiglia)
    await column.scrollIntoViewIfNeeded()
    await expect(
      column.locator(selectors.contributiInps.card(inviatoAllaFamiglia.id)),
    ).toBeVisible({ timeout: 30_000 })
  })
})
