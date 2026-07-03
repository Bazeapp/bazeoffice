import { expect, test } from "@playwright/test"

import { E2E_ASSUNZIONI } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoAssunzioni,
  loadDeferredColumn,
  openCardSheet,
  reloadAssunzioni,
  setStatoAssunzioneInSheet,
} from "../support/assunzioni"
import {
  readRapportoStatoAssunzione,
  resetAssunzioniFixture,
} from "../support/rapporti-mutations"

const { avviarePratica, inviataRichiestaDati, contrattoFirmatoAttivo, nonAssumeConBaze } =
  E2E_ASSUNZIONI.rapporti
const { avviarePratica: avviareStage, inviataRichiestaDati: inviataStage, contrattoFirmato, nonAssumeConBaze: nonAssumeStage } =
  E2E_ASSUNZIONI.stages

test.describe("assunzioni: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssunzioniFixture()
    await reloadAssunzioni(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoAssunzioni(page)
    await expectCardInColumn(page, avviarePratica.id, avviareStage)

    await dragCardToColumn(page, avviarePratica.id, inviataStage)
    await expectCardNotInColumn(page, avviarePratica.id, avviareStage)
    await expectCardInColumn(page, avviarePratica.id, inviataStage)

    const persisted = await readRapportoStatoAssunzione(avviarePratica.id)
    expect(persisted).toBe(inviataStage)

    await reloadAssunzioni(page)
    await expectCardInColumn(page, avviarePratica.id, inviataStage)
  })

  test("sheet stato assunzione change moves card and persists after reload", async ({
    page,
  }) => {
    await gotoAssunzioni(page)
    await expectCardInColumn(page, inviataRichiestaDati.id, inviataStage)

    await openCardSheet(page, inviataRichiestaDati.id)
    await setStatoAssunzioneInSheet(page, avviareStage)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, inviataRichiestaDati.id, inviataStage)
    await expectCardInColumn(page, inviataRichiestaDati.id, avviareStage)

    await reloadAssunzioni(page)
    await expectCardInColumn(page, inviataRichiestaDati.id, avviareStage)

    const persisted = await readRapportoStatoAssunzione(inviataRichiestaDati.id)
    expect(persisted).toBe(avviareStage)
  })

  test("deferred contratto firmato column loads fixture cards on demand", async ({ page }) => {
    await gotoAssunzioni(page)
    await loadDeferredColumn(page, contrattoFirmato)
    await expectCardInColumn(page, contrattoFirmatoAttivo.id, contrattoFirmato)
  })

  test("deferred non assume con Baze column loads fixture cards on demand", async ({
    page,
  }) => {
    await gotoAssunzioni(page)
    await loadDeferredColumn(page, nonAssumeStage)
    await expectCardInColumn(page, nonAssumeConBaze.id, nonAssumeStage)
  })
})
