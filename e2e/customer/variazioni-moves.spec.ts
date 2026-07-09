import { expect, test } from "@playwright/test"

import { E2E_VARIAZIONI } from "../constants"
import {
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoVariazioni,
  openCreateDialog,
  reloadVariazioni,
} from "../support/variazioni"
import { readVariazioneStato, resetVariazioniFixture } from "../support/variazioni-mutations"

const { presaInCarico } = E2E_VARIAZIONI.variazioni
const { presaInCarico: presaStage, variazioneEffettuata: effettuataStage } =
  E2E_VARIAZIONI.stages
const { createRapporto } = E2E_VARIAZIONI

test.describe("variazioni: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetVariazioniFixture()
    await reloadVariazioni(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoVariazioni(page)
    await expectCardInColumn(page, presaInCarico.id, presaStage)

    await dragCardToColumn(page, presaInCarico.id, effettuataStage)
    await expectCardNotInColumn(page, presaInCarico.id, presaStage)
    await expectCardInColumn(page, presaInCarico.id, effettuataStage)

    const persisted = await readVariazioneStato(presaInCarico.id)
    expect(persisted).toBe(effettuataStage)

    await reloadVariazioni(page)
    await expectCardInColumn(page, presaInCarico.id, effettuataStage)
  })

  test("create dialog adds a new variazione in presa in carico", async ({ page }) => {
    await gotoVariazioni(page)
    const dialog = await openCreateDialog(page)

    await dialog
      .getByPlaceholder("Cerca per famiglia o lavoratore...")
      .fill(createRapporto.lavoratoreSearchText)
    await dialog
      .getByRole("button", {
        name: new RegExp(
          `${createRapporto.famigliaSearchText}.*${createRapporto.lavoratoreSearchText}`,
        ),
      })
      .first()
      .click()
    await dialog
      .getByPlaceholder("Es. aumento ore, cambio paga, modifica luogo di lavoro...")
      .fill("E2E variazione creata da test")

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/create-record") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    )
    await dialog.getByRole("button", { name: "Crea variazione" }).click()
    const response = await createResponse
    const body = (await response.json()) as { row?: { id?: string } }
    const createdId = body.row?.id
    expect(createdId).toBeTruthy()

    await expect(page.locator('[data-testid="variazioni-create-dialog"]')).toHaveCount(0)
    await expectCardInColumn(page, createdId!, presaStage)

    const persisted = await readVariazioneStato(createdId!)
    expect(persisted).toBe(presaStage)
  })
})
