import { expect, test } from "@playwright/test"

import { E2E_CONTRIBUTI_INPS } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoContributiInps,
  openCardSheet,
  reloadContributiInps,
  setStatoContributoInSheet,
} from "../support/contributi-inps"
import {
  readContributoInpsStato,
  resetContributiInpsFixture,
} from "../support/contributi-inps-mutations"

const { daRichiedere } = E2E_CONTRIBUTI_INPS.contributi
const { daRichiedere: daRichiedereStage, pagopaRicevuto: pagopaStage } =
  E2E_CONTRIBUTI_INPS.stages

test.describe("contributi-inps: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetContributiInpsFixture()
    await reloadContributiInps(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoContributiInps(page)
    await expectCardInColumn(page, daRichiedere.id, daRichiedereStage)

    await dragCardToColumn(page, daRichiedere.id, pagopaStage)
    await expectCardNotInColumn(page, daRichiedere.id, daRichiedereStage)
    await expectCardInColumn(page, daRichiedere.id, pagopaStage)

    const persisted = await readContributoInpsStato(daRichiedere.id)
    expect(persisted).toBe(pagopaStage)

    await reloadContributiInps(page)
    await expectCardInColumn(page, daRichiedere.id, pagopaStage)
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoContributiInps(page)
    await expectCardInColumn(page, daRichiedere.id, daRichiedereStage)

    await openCardSheet(page, daRichiedere.id)
    await setStatoContributoInSheet(page, pagopaStage)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, daRichiedere.id, daRichiedereStage)
    await expectCardInColumn(page, daRichiedere.id, pagopaStage)

    await reloadContributiInps(page)
    await expectCardInColumn(page, daRichiedere.id, pagopaStage)

    const persisted = await readContributoInpsStato(daRichiedere.id)
    expect(persisted).toBe(pagopaStage)
  })
})
