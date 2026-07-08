import { expect, test } from "@playwright/test"

import { E2E_CHIUSURE } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoChiusure,
  openCardSheet,
  reloadChiusure,
  setStatoChiusuraInSheet,
} from "../support/chiusure"
import { readChiusuraStato, resetChiusureFixture } from "../support/chiusure-mutations"

const { dimissioni, licenziamento } = E2E_CHIUSURE.chiusure
const {
  lavoratoreComunicaDimissioni,
  datoreComunicaLicenziamento,
  chiusuraPronta,
} = E2E_CHIUSURE.stages

test.describe("chiusure: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetChiusureFixture()
    await reloadChiusure(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoChiusure(page)
    await expectCardInColumn(page, dimissioni.id, lavoratoreComunicaDimissioni)

    await dragCardToColumn(page, dimissioni.id, datoreComunicaLicenziamento)
    await expectCardNotInColumn(page, dimissioni.id, lavoratoreComunicaDimissioni)
    await expectCardInColumn(page, dimissioni.id, datoreComunicaLicenziamento)

    const persisted = await readChiusuraStato(dimissioni.id)
    expect(persisted).toBe(datoreComunicaLicenziamento)

    await reloadChiusure(page)
    await expectCardInColumn(page, dimissioni.id, datoreComunicaLicenziamento)
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoChiusure(page)
    await expectCardInColumn(page, licenziamento.id, datoreComunicaLicenziamento)

    await openCardSheet(page, licenziamento.id)
    await setStatoChiusuraInSheet(page, lavoratoreComunicaDimissioni)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, licenziamento.id, datoreComunicaLicenziamento)
    await expectCardInColumn(page, licenziamento.id, lavoratoreComunicaDimissioni)

    await reloadChiusure(page)
    await expectCardInColumn(page, licenziamento.id, lavoratoreComunicaDimissioni)

    const persisted = await readChiusuraStato(licenziamento.id)
    expect(persisted).toBe(lavoratoreComunicaDimissioni)
  })

  test("cannot advance past licenziamento without linked assunzioni", async ({ page }) => {
    await gotoChiusure(page)
    await expectCardInColumn(page, licenziamento.id, datoreComunicaLicenziamento)

    await dragCardToColumn(page, licenziamento.id, chiusuraPronta, { expectUpdate: false })
    await expectCardInColumn(page, licenziamento.id, datoreComunicaLicenziamento)
    await expectCardNotInColumn(page, licenziamento.id, chiusuraPronta)

    const persisted = await readChiusuraStato(licenziamento.id)
    expect(persisted).toBe(datoreComunicaLicenziamento)
  })
})
