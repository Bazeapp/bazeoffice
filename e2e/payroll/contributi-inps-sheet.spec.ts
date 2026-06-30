import { expect, test } from "@playwright/test"

import { E2E_CONTRIBUTI_INPS } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoContributiInps,
  openCardSheet,
  reloadContributiInps,
  waitForContributoInpsDetail,
} from "../support/contributi-inps"
import { resetContributiInpsFixture } from "../support/contributi-inps-mutations"
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

  test.afterEach(async ({ page }) => {
    await resetContributiInpsFixture()
    await reloadContributiInps(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoContributiInps(page)
    const dialog = await openCardSheet(page, pagopaRicevuto.id)
    await waitForContributoInpsDetail(page)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          pagopaRicevuto.famigliaSearchText,
          pagopaRicevuto.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Contributo INPS", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Allegato", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Stato contributo", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Trimestre", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.contributiInps.sheetDialog)).toHaveCount(0)
  })

  test("contributo section shows importo and editable fields", async ({ page }) => {
    await gotoContributiInps(page)
    const dialog = await openCardSheet(page, pagopaRicevuto.id)
    await waitForContributoInpsDetail(page)

    await expect(dialog.getByText("Importo contributo INPS", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Valore PagoPA", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Data invio famiglia", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Importo attuale", { exact: true })).toBeVisible()
    await expect(dialog.getByText("PagoPA attuale", { exact: true })).toBeVisible()
  })

  test("allegato section renders upload slot", async ({ page }) => {
    await gotoContributiInps(page)
    const dialog = await openCardSheet(page, pagopaRicevuto.id)
    await waitForContributoInpsDetail(page)

    await expect(dialog.getByText("Allegato PagoPA", { exact: true })).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoContributiInps(page)

    await openCardSheet(page, daRichiedere.id)
    await waitForContributoInpsDetail(page)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          daRichiedere.famigliaSearchText,
          daRichiedere.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, inviatoAllaFamiglia.id)
    await waitForContributoInpsDetail(page)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviatoAllaFamiglia.famigliaSearchText,
          inviatoAllaFamiglia.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          daRichiedere.famigliaSearchText,
          daRichiedere.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })

  test("inviato alla famiglia fixture is reachable in the far-right populated column", async ({
    page,
  }) => {
    await gotoContributiInps(page)
    const column = getColumn(page, E2E_CONTRIBUTI_INPS.stages.inviatoAllaFamiglia)
    await column.scrollIntoViewIfNeeded()
    await expect(
      column.locator(selectors.contributiInps.card(inviatoAllaFamiglia.id)),
    ).toBeVisible({ timeout: 30_000 })
  })
})
