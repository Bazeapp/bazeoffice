import { expect, test } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoCedolini,
  openCardSheet,
  reloadCedolini,
  waitForCedolinoDetail,
  waitForCedolinoPresenzeSection,
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

  test("header shows month label and editable workflow stato", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, todo.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText(E2E_CEDOLINI.monthLabel, { exact: true })).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toContainText(E2E_CEDOLINI.stages.todo)
  })

  test("linked rapporto summary shows navigation and contract context", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, todo.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Vai al rapporto" })).toBeVisible()
    await expect(dialog.getByText("Tipo", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Ore sett.", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Inizio", { exact: true })).toBeVisible()
  })

  test("linked rapporto navigation opens rapporto detail page", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, todo.id)
    await waitForCedolinoDetail(page)

    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()
    await expect(page).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${todo.rapportoId}`),
    )
    await expect(page.getByRole("tab", { name: "Contratto", exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("dettagli rapporto section shows relationship metadata fields", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, todo.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Data creazione rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Data fine rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Codice Datore Webcolf", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Codice Lavoratore Webcolf", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Data invio famiglia", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Caso particolare?", { exact: true })).toBeVisible()
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
    await expect(dialog.getByText("Cedolino corretto?", { exact: true })).toBeVisible()
  })

  test("pagamento section shows payment summary fields", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Totale ore da pagare", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Fee concordata", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Application fee", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Importo cedolino", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Importo sconto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Stato pagamento", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo pagamento", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Data pagamento", { exact: true })).toBeVisible()
  })

  test("feedback section shows rating and written feedback fields", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)
    await waitForCedolinoDetail(page)

    await expect(dialog.getByText("Feedback rating", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Feedback scritto", { exact: true })).toBeVisible()
  })

  test("presenze section shows attendance summary for fixture with presenze", async ({ page }) => {
    await gotoCedolini(page)
    const dialog = await openCardSheet(page, ricezionePresenze.id)
    await waitForCedolinoDetail(page)
    await waitForCedolinoPresenzeSection(page)

    await expect(dialog.getByText("Distribuzione ore settimanali", { exact: true })).toBeVisible()
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
