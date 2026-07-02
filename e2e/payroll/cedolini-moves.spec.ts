import { expect, test } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoCedolini,
  openCardSheet,
  reloadCedolini,
  setStatoCedolinoInSheet,
} from "../support/cedolini"
import { readCedolinoStato, resetCedoliniFixture } from "../support/cedolini-mutations"

const { todo } = E2E_CEDOLINI.cedolini
const { todo: todoStage, inviateRichiestaPresenze: inviateStage } = E2E_CEDOLINI.stages

test.describe("cedolini: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetCedoliniFixture()
    await reloadCedolini(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoCedolini(page)
    await expectCardInColumn(page, todo.id, todoStage)

    await dragCardToColumn(page, todo.id, inviateStage)
    await expectCardNotInColumn(page, todo.id, todoStage)
    await expectCardInColumn(page, todo.id, inviateStage)

    const persisted = await readCedolinoStato(todo.id)
    expect(persisted).toBe(inviateStage)

    await reloadCedolini(page)
    await expectCardInColumn(page, todo.id, inviateStage)
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoCedolini(page)
    await expectCardInColumn(page, todo.id, todoStage)

    await openCardSheet(page, todo.id)
    await setStatoCedolinoInSheet(page, inviateStage)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, todo.id, todoStage)
    await expectCardInColumn(page, todo.id, inviateStage)

    await reloadCedolini(page)
    await expectCardInColumn(page, todo.id, inviateStage)

    const persisted = await readCedolinoStato(todo.id)
    expect(persisted).toBe(inviateStage)
  })
})
