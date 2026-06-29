import { expect, test } from "@playwright/test"

import { E2E_PIPELINE } from "../constants"
import {
  closeCardSheet,
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  expectPersistedStatoSales,
  gotoPipeline,
  openCardSheet,
  setStatoInSheet,
} from "../support/pipeline"
import {
  readProcessoStatoSales,
  resetPipelineFixture,
} from "../support/processo-mutations"
import { interceptEdgeFunction } from "../support/route-errors"

const { mover, acquisition } = E2E_PIPELINE.processi
const { stages, stageLabels } = E2E_PIPELINE

test.describe("pipeline: kanban moves", () => {
  test.describe.configure({ timeout: 60_000 })

  test.afterEach(async () => {
    await resetPipelineFixture()
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoPipeline(page)
    await expectCardInColumn(page, mover.id, stages.warmLead)

    await openCardSheet(page, mover.id)
    await setStatoInSheet(page, stageLabels.hotAttesaPrimoContatto)
    await closeCardSheet(page)

    await expectCardNotInColumn(page, mover.id, stages.warmLead)
    await expectCardInColumn(page, mover.id, stages.hotAttesaPrimoContatto)

    await page.reload()
    await expect(page.getByRole("heading", { name: "Sales Pipeline" })).toBeVisible({
      timeout: 30_000,
    })
    await expectCardInColumn(page, mover.id, stages.hotAttesaPrimoContatto)

    const persisted = await readProcessoStatoSales(mover.id)
    expectPersistedStatoSales(
      persisted,
      stages.hotAttesaPrimoContatto,
      stageLabels.hotAttesaPrimoContatto,
    )
  })

  test("selecting the same stato is a no-op", async ({ page }) => {
    await gotoPipeline(page)
    await openCardSheet(page, mover.id)
    await setStatoInSheet(page, stageLabels.warmLead, { expectUpdate: false })
    await closeCardSheet(page)

    await expectCardInColumn(page, mover.id, stages.warmLead)
    expectPersistedStatoSales(
      await readProcessoStatoSales(mover.id),
      stages.warmLead,
      stageLabels.warmLead,
    )
  })

  test("acquisition progression warm to hot to won persists each step", async ({ page }) => {
    await gotoPipeline(page)
    await expectCardInColumn(page, acquisition.id, stages.warmLead)

    await openCardSheet(page, acquisition.id)
    await setStatoInSheet(page, stageLabels.hotAttesaPrimoContatto)
    await closeCardSheet(page)
    await expectCardInColumn(page, acquisition.id, stages.hotAttesaPrimoContatto)
    expectPersistedStatoSales(
      await readProcessoStatoSales(acquisition.id),
      stages.hotAttesaPrimoContatto,
      stageLabels.hotAttesaPrimoContatto,
    )

    await openCardSheet(page, acquisition.id)
    await setStatoInSheet(page, stageLabels.wonInAttesaConferma)
    await closeCardSheet(page)
    await expectCardInColumn(page, acquisition.id, stages.wonInAttesaConferma)
    expectPersistedStatoSales(
      await readProcessoStatoSales(acquisition.id),
      stages.wonInAttesaConferma,
      stageLabels.wonInAttesaConferma,
    )

    await page.reload()
    await expectCardInColumn(page, acquisition.id, stages.wonInAttesaConferma)
  })

  test("deferred closed column can be loaded when present", async ({ page }) => {
    await gotoPipeline(page)

    const loadButton = page.getByRole("button", { name: /Carica \d+ ricerche?/ }).first()
    if ((await loadButton.count()) === 0) {
      test.skip(true, "No deferred pipeline columns with pending rows in this seed")
    }

    await loadButton.click()
    await expect(page.getByText("Colonna non caricata di default.")).toHaveCount(0, {
      timeout: 30_000,
    })
  })

  test("failed stato update rolls back optimistic move", async ({ page }) => {
    await gotoPipeline(page)
    await interceptEdgeFunction(page, "update-record", 500)

    await openCardSheet(page, mover.id)
    await setStatoInSheet(page, stageLabels.hotAttesaPrimoContatto)
    await closeCardSheet(page)

    await expectCardInColumn(page, mover.id, stages.warmLead)
    await expect(page.getByText(/Errore caricamento dati CRM/i)).toBeVisible()
    expectPersistedStatoSales(
      await readProcessoStatoSales(mover.id),
      stages.warmLead,
      stageLabels.warmLead,
    )
  })

  test.fixme("native drag-and-drop moves card to target column (best-effort)", async ({
    page,
  }) => {
    await gotoPipeline(page)
    await expectCardInColumn(page, mover.id, stages.warmLead)

    await dragCardToColumn(page, mover.id, stages.hotAttesaPrimoContatto)
    await expectCardInColumn(page, mover.id, stages.hotAttesaPrimoContatto)

    const persisted = await readProcessoStatoSales(mover.id)
    expect([stages.hotAttesaPrimoContatto, stageLabels.hotAttesaPrimoContatto]).toContain(
      persisted,
    )
  })
})
