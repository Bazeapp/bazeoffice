import { expect, test } from "@playwright/test"

import { E2E_ASSUNZIONI } from "../constants"
import {
  closeCardSheet,
  gotoAssunzioni,
  openCardSheet,
  reloadAssunzioni,
  waitForAssunzioniDetail,
} from "../support/assunzioni"
import { resetAssunzioniFixture } from "../support/rapporti-mutations"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { inviataRichiestaDati, avviarePratica } = E2E_ASSUNZIONI.rapporti

test.describe("assunzioni: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssunzioniFixture()
    await reloadAssunzioni(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviataRichiestaDati.famigliaSearchText,
          inviataRichiestaDati.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Contesto pratica", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Documenti del rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Datore collegato", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Lavoratore collegato", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.assunzioni.sheetDialog)).toHaveCount(0)
  })

  test("contesto pratica shows editable stato assunzione and contract fields", async ({
    page,
  }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await expect(dialog.getByText("Contesto pratica", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Stato assunzione", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Tipologia contratto", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Tipo rapporto", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
  })

  test("switching datore/lavoratore target updates the detail panel", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await dialog.getByText("Lavoratore collegato", { exact: true }).click()
    await expect(dialog.getByText("Riepilogo lavoratore", { exact: true })).toBeVisible({
      timeout: 10_000,
    })

    await dialog.getByText("Datore collegato", { exact: true }).click()
    await expect(dialog.getByText("Riepilogo datore", { exact: true })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoAssunzioni(page)

    await openCardSheet(page, inviataRichiestaDati.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviataRichiestaDati.famigliaSearchText,
          inviataRichiestaDati.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, avviarePratica.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          avviarePratica.famigliaSearchText,
          avviarePratica.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviataRichiestaDati.famigliaSearchText,
          inviataRichiestaDati.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })

  test("delete rapporto action is available for linked cards", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await expect(
      dialog.getByRole("button", { name: "Elimina record" }),
    ).toBeVisible()
  })
})
