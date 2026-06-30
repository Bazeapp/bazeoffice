import { expect, test } from "@playwright/test"

import { E2E_PROVE_COLLOQUI } from "../constants"
import {
  closeSheet,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoProveColloqui,
  openProvaSheet,
  reloadProveColloqui,
  setStatoProvaInSheet,
} from "../support/prove-colloqui"
import {
  readRapportoProvaStatoCs,
  resetProveColloquiFixture,
} from "../support/prove-colloqui-mutations"

const { chiamareFamiglia } = E2E_PROVE_COLLOQUI.rapporti
const { chiamareFamigliaPreProva, chiamareLavoratorePreProva } = E2E_PROVE_COLLOQUI.stages

test.describe("prove-colloqui: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetProveColloquiFixture()
    await reloadProveColloqui(page)
  })

  test("sheet stato prova change moves card and persists after reload", async ({ page }) => {
    await gotoProveColloqui(page)
    await expectCardInColumn(page, chiamareFamiglia.id, chiamareFamigliaPreProva)

    await openProvaSheet(page, chiamareFamiglia.id)
    await setStatoProvaInSheet(page, chiamareLavoratorePreProva)
    await closeSheet(page)

    await expectCardNotInColumn(page, chiamareFamiglia.id, chiamareFamigliaPreProva)
    await expectCardInColumn(page, chiamareFamiglia.id, chiamareLavoratorePreProva)

    const persisted = await readRapportoProvaStatoCs(chiamareFamiglia.id)
    expect(persisted).toBe(chiamareLavoratorePreProva)

    await reloadProveColloqui(page)
    await expectCardInColumn(page, chiamareFamiglia.id, chiamareLavoratorePreProva)
  })
})
