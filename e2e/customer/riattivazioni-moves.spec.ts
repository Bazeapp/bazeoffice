import { expect, test } from "@playwright/test"

import { E2E_RIATTIVAZIONI } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoRiattivazioni,
  openCardSheet,
  reloadRiattivazioni,
  setStatoRiattivazioneInSheet,
} from "../support/riattivazioni"
import {
  readRiattivazioneStato,
  resetRiattivazioniFixture,
} from "../support/riattivazioni-mutations"

const { daSentire, inAttesa } = E2E_RIATTIVAZIONI.chiusure
const { daSentire: daSentireStage, inAttesa: inAttesaStage, riattivato: riattivatoStage } =
  E2E_RIATTIVAZIONI.stages
const {
  daSentire: daSentireLabel,
  inAttesa: inAttesaLabel,
  riattivato: riattivatoLabel,
} = E2E_RIATTIVAZIONI.stageLabels

test.describe("riattivazioni: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetRiattivazioniFixture()
    await reloadRiattivazioni(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoRiattivazioni(page)
    await expectCardInColumn(page, daSentire.id, daSentireStage)

    await dragCardToColumn(page, daSentire.id, inAttesaStage)
    await expectCardNotInColumn(page, daSentire.id, daSentireStage)
    await expectCardInColumn(page, daSentire.id, inAttesaStage)

    const persisted = await readRiattivazioneStato(daSentire.id)
    expect(persisted).toBe(inAttesaStage)

    await reloadRiattivazioni(page)
    await expectCardInColumn(page, daSentire.id, inAttesaStage)
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoRiattivazioni(page)
    await expectCardInColumn(page, inAttesa.id, inAttesaStage)

    await openCardSheet(page, inAttesa.id)
    await setStatoRiattivazioneInSheet(page, riattivatoLabel)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, inAttesa.id, inAttesaStage)
    await expectCardInColumn(page, inAttesa.id, riattivatoStage)

    await reloadRiattivazioni(page)
    await expectCardInColumn(page, inAttesa.id, riattivatoStage)

    const persisted = await readRiattivazioneStato(inAttesa.id)
    expect(persisted).toBe(riattivatoStage)
  })

  test("sheet can move card back to da sentire", async ({ page }) => {
    await gotoRiattivazioni(page)
    await expectCardInColumn(page, inAttesa.id, inAttesaStage)

    await openCardSheet(page, inAttesa.id)
    await setStatoRiattivazioneInSheet(page, daSentireLabel)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, inAttesa.id, inAttesaStage)
    await expectCardInColumn(page, inAttesa.id, daSentireStage)

    const persisted = await readRiattivazioneStato(inAttesa.id)
    expect(persisted).toBe(daSentireStage)
  })
})
