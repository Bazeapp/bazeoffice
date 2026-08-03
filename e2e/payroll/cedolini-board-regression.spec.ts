import { expect, test } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  ensureCedoliniFixtureMonth,
  expectVisibleCedoliniFixtureCount,
  getColumn,
  gotoCedolini,
  switchToBoardTab,
  switchToControlliTab,
  switchToPagamentiTab,
} from "../support/cedolini"

test.describe("cedolini: board regression after mode tabs", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  const { todo, ricezionePresenze } = E2E_CEDOLINI.cedolini

  test("Board fixtures remain visible after visiting Controlli and Pagamenti", async ({
    page,
  }) => {
    await gotoCedolini(page)
    await expectVisibleCedoliniFixtureCount(page, 3)

    await switchToControlliTab(page)
    await expect(page.getByTestId("cedolini-controlli-avvia")).toBeVisible()

    await switchToPagamentiTab(page)
    await expect(page.getByTestId("cedolini-pagamenti-da-fare")).toBeVisible()

    await switchToBoardTab(page)
    await ensureCedoliniFixtureMonth(page)
    await expectVisibleCedoliniFixtureCount(page, 3)
    await expect(getColumn(page, E2E_CEDOLINI.stages.todo)).toBeVisible()
    await expect(getColumn(page, E2E_CEDOLINI.stages.ricezionePresenze)).toBeVisible()
    await expect(page.locator(`[data-testid="cedolini-card-${todo.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="cedolini-card-${ricezionePresenze.id}"]`)).toBeVisible()
  })
})
