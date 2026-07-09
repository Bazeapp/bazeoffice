import { expect, test } from "@playwright/test"

import { E2E_PROVE_COLLOQUI } from "../constants"
import {
  closeSheet,
  gotoProveColloqui,
  openProvaSheet,
  reloadProveColloqui,
  waitForProvaDetail,
} from "../support/prove-colloqui"
import { resetProveColloquiFixture } from "../support/prove-colloqui-mutations"
import { selectors } from "../support/selectors"

function expectedProvaTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { chiamareLavoratore, chiamareFamiglia } = E2E_PROVE_COLLOQUI.rapporti

test.describe("prove-colloqui: prova detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetProveColloquiFixture()
    await reloadProveColloqui(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoProveColloqui(page)
    const dialog = await openProvaSheet(page, chiamareLavoratore.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedProvaTitle(
          chiamareLavoratore.famigliaSearchText,
          chiamareLavoratore.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Rapporto", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("D0 - Pre-prova", { exact: true })).toBeVisible()
    await expect(dialog.getByText("D1 - Feedback", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Registrazioni chiamate", { exact: true })).toBeVisible()

    await closeSheet(page)
    await expect(page.locator(selectors.proveColloqui.sheetDialog)).toHaveCount(0)
  })

  test("header shows editable stato CS prova", async ({ page }) => {
    await gotoProveColloqui(page)
    const dialog = await openProvaSheet(page, chiamareLavoratore.id)
    await waitForProvaDetail(page)

    await expect(dialog.getByText("Stato CS Prova", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
  })

  test("rapporto section shows contract context fields", async ({ page }) => {
    await gotoProveColloqui(page)
    const dialog = await openProvaSheet(page, chiamareLavoratore.id)
    await waitForProvaDetail(page)

    await expect(dialog.getByText("Stato Pratica Assunzione", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Ore Settimanali", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Data Inizio Rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Vai al rapporto" })).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoProveColloqui(page)

    await openProvaSheet(page, chiamareLavoratore.id)
    await expect(
      page.getByRole("heading", {
        name: expectedProvaTitle(
          chiamareLavoratore.famigliaSearchText,
          chiamareLavoratore.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeSheet(page)
    await openProvaSheet(page, chiamareFamiglia.id)
    await expect(
      page.getByRole("heading", {
        name: expectedProvaTitle(
          chiamareFamiglia.famigliaSearchText,
          chiamareFamiglia.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedProvaTitle(
          chiamareLavoratore.famigliaSearchText,
          chiamareLavoratore.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })
})
