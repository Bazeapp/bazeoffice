import { expect, test } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoCedolini,
  openCardSheet,
  reloadCedolini,
  waitForCedolinoDetail,
} from "../support/cedolini"
import { resetCedoliniFixture } from "../support/cedolini-mutations"
import { selectors } from "../support/selectors"

function expectedRelationshipTitle(
  famigliaSearchText: string,
  lavoratoreSearchText: string,
) {
  return new RegExp(`${famigliaSearchText}.*${lavoratoreSearchText}`)
}

const { todo, ricezionePresenze, inviatoCedolino } = E2E_CEDOLINI.cedolini

test.describe("cedolini: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetCedoliniFixture()
    await reloadCedolini(page)
  })

  test("opens with relationship title and primary sections, then closes", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          ricezionePresenze.famigliaSearchText,
          ricezionePresenze.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText("Dettagli rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Cedolino", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Pagamento", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Presenze", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Feedback", { exact: true })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.cedolini.sheetDialog)).toHaveCount(0)
  })

  test("cedolino section shows importo and editable fields", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Importo busta paga", { exact: true })).toBeVisible()
    await expect(dialog.getByText("URL cedolino", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Note interne", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Ore da contratto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Ore svolte", { exact: true })).toBeVisible()
  })

  test("presenze section renders monthly table for fixture with presenze", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Presenze", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("columnheader", { name: "GG" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(dialog.getByRole("columnheader", { name: "Ore", exact: true })).toBeVisible()
    await expect(dialog.getByRole("columnheader", { name: "Evento" })).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoCedolini(page)

    await openCardSheet(page, todo.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(todo.famigliaSearchText, todo.lavoratoreSearchText),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(page)
    await openCardSheet(page, inviatoCedolino.id)
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviatoCedolino.famigliaSearchText,
          inviatoCedolino.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("heading", {
        name: expectedRelationshipTitle(todo.famigliaSearchText, todo.lavoratoreSearchText),
      }),
    ).toHaveCount(0)
  })

  test("inviato cedolino fixture is reachable in the far-right workflow column", async ({
    page,
  }) => {
    await gotoCedolini(page)
    const column = getColumn(page, E2E_CEDOLINI.stages.inviatoCedolino)
    await column.scrollIntoViewIfNeeded()
    await expect(column.locator(selectors.cedolini.card(inviatoCedolino.id))).toBeVisible({
      timeout: 30_000,
    })
  })
})
