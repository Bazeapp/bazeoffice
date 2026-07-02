import { expect, test } from "@playwright/test"

import { E2E_VARIAZIONI } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoVariazioni,
  openCardSheet,
  reloadVariazioni,
  waitForVariazioniDetail,
} from "../support/variazioni"
import { resetVariazioniFixture } from "../support/variazioni-mutations"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { presaInCarico, variazioneEffettuata, documentiInviati } = E2E_VARIAZIONI.variazioni

test.describe("variazioni: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetVariazioniFixture()
    await reloadVariazioni(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoVariazioni(page)
    const dialog = await openCardSheet(page, presaInCarico.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          presaInCarico.famigliaSearchText,
          presaInCarico.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Dati lavoratore", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Dati famiglia", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Dettagli variazione", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Dati rapporto lavorativo", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Documenti variazione", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.variazioni.sheetDialog)).toHaveCount(0)
  })

  test("detail sections show variation fields and rapporto summary", async ({ page }) => {
    await gotoVariazioni(page)
    const dialog = await openCardSheet(page, variazioneEffettuata.id)
    await waitForVariazioniDetail(page)

    await expect(dialog.getByText("Data di partenza:", { exact: false })).toBeVisible()
    await expect(dialog.getByText("Variazione da applicare:", { exact: false })).toBeVisible()
    await expect(dialog.getByText(variazioneEffettuata.variazioneSearchText)).toBeVisible()
    await expect(dialog.getByText("Paga oraria lorda:", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Ore settimanali:", { exact: true })).toBeVisible()
  })

  test("edit mode exposes variation detail form fields", async ({ page }) => {
    await gotoVariazioni(page)
    const dialog = await openCardSheet(page, presaInCarico.id)
    await waitForVariazioniDetail(page)

    await dialog.getByRole("button", { name: "Modifica dettagli variazione" }).click()
    await expect(dialog.getByText("Data di partenza", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Variazione da applicare", { exact: true })).toBeVisible()
  })

  test("edit mode exposes rapporto lavorativo form fields", async ({ page }) => {
    await gotoVariazioni(page)
    const dialog = await openCardSheet(page, presaInCarico.id)
    await waitForVariazioniDetail(page)

    await dialog.getByRole("button", { name: "Modifica dati rapporto lavorativo" }).click()
    await expect(dialog.getByText("Paga oraria lorda", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Ore settimanali", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo contratto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Distribuzione ore settimanali", { exact: true })).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoVariazioni(page)

    await openCardSheet(page, presaInCarico.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          presaInCarico.famigliaSearchText,
          presaInCarico.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, variazioneEffettuata.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          variazioneEffettuata.famigliaSearchText,
          variazioneEffettuata.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          presaInCarico.famigliaSearchText,
          presaInCarico.lavoratoreSearchText,
        ),
      }),
    ).toHaveCount(0)
  })

  test("documenti inviati fixture is reachable in the far-right workflow column", async ({
    page,
  }) => {
    await gotoVariazioni(page)
    const column = getColumn(page, E2E_VARIAZIONI.stages.documentiInviati)
    await column.scrollIntoViewIfNeeded()
    await expect(column.locator(selectors.variazioni.card(documentiInviati.id))).toBeVisible({
      timeout: 30_000,
    })
  })
})
