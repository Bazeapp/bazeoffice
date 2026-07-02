import { expect, test } from "@playwright/test"

import { E2E_CHIUSURE } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoChiusure,
  openCardSheet,
  reloadChiusure,
  waitForChiusureDetail,
} from "../support/chiusure"
import { resetChiusureFixture } from "../support/chiusure-mutations"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { dimissioni, licenziamento, elaborata } = E2E_CHIUSURE.chiusure

test.describe("chiusure: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetChiusureFixture()
    await reloadChiusure(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoChiusure(page)
    const dialog = await openCardSheet(page, dimissioni.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          dimissioni.famigliaSearchText,
          dimissioni.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Associazione rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Dettagli chiusura", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Allegato chiusura", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.chiusure.sheetDialog)).toHaveCount(0)
  })

  test("detail sections show closure fields and editable stato", async ({ page }) => {
    await gotoChiusure(page)
    const dialog = await openCardSheet(page, licenziamento.id)
    await waitForChiusureDetail(page)

    await expect(dialog.getByText("Data fine rapporto:", { exact: false })).toBeVisible()
    await expect(dialog.getByText("Motivazione:", { exact: false })).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
    await expect(
      dialog.getByPlaceholder("Cerca per famiglia o lavoratore..."),
    ).toBeVisible()
  })

  test("edit mode exposes closure detail form fields", async ({ page }) => {
    await gotoChiusure(page)
    const dialog = await openCardSheet(page, dimissioni.id)
    await waitForChiusureDetail(page)

    await dialog.getByRole("button", { name: "Modifica dettagli chiusura" }).click()
    await expect(dialog.getByText("Data fine rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo licenziamento/dimissione", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Motivazione", { exact: true })).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoChiusure(page)

    await openCardSheet(page, dimissioni.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          dimissioni.famigliaSearchText,
          dimissioni.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, licenziamento.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          licenziamento.famigliaSearchText,
          licenziamento.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          dimissioni.famigliaSearchText,
          dimissioni.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })

  test("delete chiusura action is available in the detail sheet", async ({ page }) => {
    await gotoChiusure(page)
    const dialog = await openCardSheet(page, dimissioni.id)
    await waitForChiusureDetail(page)

    await expect(
      dialog.getByRole("button", { name: "Elimina record" }),
    ).toBeVisible()
  })

  test("elaborata fixture is reachable in the far-right workflow column", async ({ page }) => {
    await gotoChiusure(page)
    const column = getColumn(page, E2E_CHIUSURE.stages.chiusuraElaborata)
    await column.scrollIntoViewIfNeeded()
    await expect(column.locator(selectors.chiusure.card(elaborata.id))).toBeVisible({
      timeout: 30_000,
    })
  })
})
