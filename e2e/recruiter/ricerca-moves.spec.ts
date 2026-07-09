import { expect, test } from "@playwright/test"

import { E2E_RICERCA } from "../constants"
import {
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoRicerca,
  reloadRicerca,
} from "../support/ricerca"
import {
  readProcessoAssegnazioneFields,
  resetAssegnazioneFixture,
} from "../support/processo-mutations"

const { unassignedWithRecruiter } = E2E_RICERCA.processi
const { daAssegnare, fareRicerca } = E2E_RICERCA.stages
const { fareRicerca: fareRicercaLabel } = E2E_RICERCA.stageLabels

test.describe("ricerca: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssegnazioneFixture()
    await reloadRicerca(page)
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoRicerca(page)
    await expectCardInColumn(page, unassignedWithRecruiter.id, daAssegnare)

    await dragCardToColumn(page, unassignedWithRecruiter.id, fareRicerca)
    await expectCardNotInColumn(page, unassignedWithRecruiter.id, daAssegnare)
    await expectCardInColumn(page, unassignedWithRecruiter.id, fareRicerca)

    const persisted = await readProcessoAssegnazioneFields(unassignedWithRecruiter.id)
    expect([fareRicerca, fareRicercaLabel]).toContain(persisted.statoRes)

    await reloadRicerca(page)
    await expectCardInColumn(page, unassignedWithRecruiter.id, fareRicerca)
  })

  test("deferred match or no match column can be loaded when present", async ({ page }) => {
    await gotoRicerca(page)

    const loadButtons = page.getByRole("button", {
      name: /Mostra (Match|NoMatch|no match|match)/i,
    })
    const initialCount = await loadButtons.count()
    if (initialCount === 0) {
      test.skip(true, "No deferred ricerca columns with pending rows in this seed")
    }

    await loadButtons.first().click()
    await expect(loadButtons).toHaveCount(initialCount - 1, { timeout: 30_000 })
  })
})
