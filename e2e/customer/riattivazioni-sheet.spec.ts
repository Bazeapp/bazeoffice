import { expect, test } from "@playwright/test"

import { E2E_RIATTIVAZIONI } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoRiattivazioni,
  openCardSheet,
  reloadRiattivazioni,
  waitForRiattivazioniDetail,
} from "../support/riattivazioni"
import {
  resetRiattivazioniFixture,
  setRiattivazioneFields,
} from "../support/riattivazioni-mutations"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { daSentire, inAttesa, riattivato } = E2E_RIATTIVAZIONI.chiusure

test.describe("riattivazioni: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetRiattivazioniFixture()
    await reloadRiattivazioni(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoRiattivazioni(page)
    const dialog = await openCardSheet(page, daSentire.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          daSentire.famigliaSearchText,
          daSentire.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Dati chiusura", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Allegati chiusura", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.riattivazioni.sheetDialog)).toHaveCount(0)
  })

  test("detail sections show closure fields and editable stato riattivazione", async ({
    page,
  }) => {
    await gotoRiattivazioni(page)
    const dialog = await openCardSheet(page, inAttesa.id)
    await waitForRiattivazioniDetail(page)

    const datiChiusura = dialog
      .locator("div")
      .filter({ has: page.getByText("Dati chiusura", { exact: true }) })
      .filter({ has: page.getByText("Motivazione", { exact: true }) })
      .first()

    await expect(datiChiusura.getByText("Data fine rapporto", { exact: true })).toBeVisible()
    await expect(datiChiusura.getByText("Data recall riattivazione", { exact: true })).toBeVisible()
    await expect(datiChiusura.getByText("Presenze ultimo mese", { exact: true })).toBeVisible()
    await expect(datiChiusura.getByText("Email", { exact: true })).toBeVisible()
    await expect(
      datiChiusura.getByText("Sconto proposto riattivazione", { exact: true }),
    ).toBeVisible()
    await expect(datiChiusura.getByText("Motivazione", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
  })

  test("sconto autosave persists after reopen", async ({ page }) => {
    await gotoRiattivazioni(page)

    try {
      const dialog = await openCardSheet(page, daSentire.id)
      await waitForRiattivazioniDetail(page)

      const scontoField = dialog
        .getByText("Sconto proposto riattivazione", { exact: true })
        .locator("..")
      await scontoField.getByRole("combobox").click()
      await page.getByRole("option", { name: "mese gratis", exact: true }).click()

      await page.waitForResponse(
        (response) =>
          response.url().includes("/functions/v1/update-record") &&
          response.request().method() === "POST" &&
          response.ok(),
        { timeout: 15_000 },
      )

      await closeCardSheet(page)
      const reopened = await openCardSheet(page, daSentire.id)
      await waitForRiattivazioniDetail(page)
      await expect(
        reopened
          .getByText("Sconto proposto riattivazione", { exact: true })
          .locator("..")
          .getByRole("combobox"),
      ).toContainText("mese gratis")
    } finally {
      await setRiattivazioneFields(daSentire.id, {
        sconto_proposto_riattivazione: null,
      })
    }
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoRiattivazioni(page)

    await openCardSheet(page, daSentire.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          daSentire.famigliaSearchText,
          daSentire.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, inAttesa.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          inAttesa.famigliaSearchText,
          inAttesa.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          daSentire.famigliaSearchText,
          daSentire.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })

  test("riattivato fixture is reachable in the far-right workflow column", async ({ page }) => {
    await gotoRiattivazioni(page)
    const column = getColumn(page, E2E_RIATTIVAZIONI.stages.riattivato)
    await column.scrollIntoViewIfNeeded()
    await expect(column.locator(selectors.riattivazioni.card(riattivato.id))).toBeVisible({
      timeout: 30_000,
    })
    await expect(column.getByText("Sconto mese gratis")).toBeVisible()
  })
})
