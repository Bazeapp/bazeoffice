import { expect, test, type Page } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  closeCardSheet,
  getColumn,
  gotoCedolini,
  openCardSheet,
  waitForCedolinoDetail,
  waitForCedolinoPresenzeSection,
} from "../support/cedolini"
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

  let cedoliniPage: Page

  test.beforeAll(async ({ browser }) => {
    cedoliniPage = await browser.newPage()
    await gotoCedolini(cedoliniPage)
  })

  test.afterAll(async () => {
    await cedoliniPage.close()
  })

  test("ricezione presenze sheet shows sections, fields, then closes", async () => {
    const dialog = await openCardSheet(cedoliniPage, ricezionePresenze.id)
    await waitForCedolinoDetail(cedoliniPage)
    await waitForCedolinoPresenzeSection(cedoliniPage)

    await expect(
      dialog.getByRole("heading", {
        name: expectedRelationshipTitle(
          ricezionePresenze.famigliaSearchText,
          ricezionePresenze.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })

    for (const label of [
      "Dettagli rapporto",
      "Cedolino",
      "Pagamento",
      "Presenze",
      "Feedback",
      "Importo busta paga",
      "URL cedolino",
      "Note interne",
      "Ore da contratto",
      "Ore svolte",
      "Cedolino corretto?",
      "Totale ore da pagare",
      "Fee concordata",
      "Application fee",
      "Importo cedolino",
      "Importo sconto",
      "Stato pagamento",
      "Tipo pagamento",
      "Data pagamento",
      "Feedback rating",
      "Feedback scritto",
      "Distribuzione ore settimanali",
    ]) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible()
    }

    await closeCardSheet(cedoliniPage)
    await expect(cedoliniPage.locator(selectors.cedolini.sheetDialog)).toHaveCount(0)
  })

  test("todo sheet shows header, rapporto summary and dettagli fields", async () => {
    const dialog = await openCardSheet(cedoliniPage, todo.id)
    await waitForCedolinoDetail(cedoliniPage)

    await expect(dialog.getByText(E2E_CEDOLINI.monthLabel, { exact: true })).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toContainText(E2E_CEDOLINI.stages.todo)
    await expect(dialog.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Vai al rapporto" })).toBeVisible()
    await expect(dialog.getByText("Tipo", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Ore sett.", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Inizio", { exact: true })).toBeVisible()

    for (const label of [
      "Data creazione rapporto",
      "Data fine rapporto",
      "Codice Datore Webcolf",
      "Codice Lavoratore Webcolf",
      "Data invio famiglia",
      "Caso particolare?",
    ]) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible()
    }

    await closeCardSheet(cedoliniPage)
  })

  test("linked rapporto navigation opens rapporto detail page", async () => {
    const dialog = await openCardSheet(cedoliniPage, todo.id)
    await waitForCedolinoDetail(cedoliniPage)

    await dialog.getByRole("link", { name: "Vai al rapporto" }).click()
    await expect(cedoliniPage).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${todo.rapportoId}`),
    )
    await expect(
      cedoliniPage.getByRole("tab", { name: "Contratto", exact: true }),
    ).toBeVisible({ timeout: 30_000 })

    await gotoCedolini(cedoliniPage)
  })

  test("switching cards remounts detail without stale heading", async () => {
    await openCardSheet(cedoliniPage, todo.id)
    await expect(
      cedoliniPage.getByRole("heading", {
        name: expectedRelationshipTitle(todo.famigliaSearchText, todo.lavoratoreSearchText),
      }),
    ).toBeVisible({ timeout: 30_000 })

    await closeCardSheet(cedoliniPage)
    await openCardSheet(cedoliniPage, inviatoCedolino.id)
    await expect(
      cedoliniPage.getByRole("heading", {
        name: expectedRelationshipTitle(
          inviatoCedolino.famigliaSearchText,
          inviatoCedolino.lavoratoreSearchText,
        ),
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      cedoliniPage.getByRole("heading", {
        name: expectedRelationshipTitle(todo.famigliaSearchText, todo.lavoratoreSearchText),
      }),
    ).toHaveCount(0)

    await closeCardSheet(cedoliniPage)
  })

  test("inviato cedolino fixture is reachable in the far-right workflow column", async () => {
    const column = getColumn(cedoliniPage, E2E_CEDOLINI.stages.inviatoCedolino)
    await column.scrollIntoViewIfNeeded()
    await expect(column.locator(selectors.cedolini.card(inviatoCedolino.id))).toBeVisible({
      timeout: 30_000,
    })
  })
})
