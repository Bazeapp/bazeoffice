import { expect, test, type Page } from "@playwright/test"

import { E2E_CEDOLINI } from "../constants"
import {
  ensureCedoliniFixtureMonth,
  gotoCedolini,
  gotoCedoliniWithMode,
  switchToBoardTab,
  switchToControlliTab,
  switchToPagamentiTab,
} from "../support/cedolini"

const BOARD_LOAD_TIMEOUT_MS = 30_000

test.describe("cedolini: mode tabs", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  let cedoliniPage: Page

  test.beforeAll(async ({ browser }) => {
    cedoliniPage = await browser.newPage()
    await gotoCedolini(cedoliniPage)
  })

  test.afterAll(async () => {
    await cedoliniPage.close()
  })

  test("shows Board / Controlli / Pagamenti tabs on the Cedolini page", async () => {
    await expect(cedoliniPage.getByTestId("cedolini-mode-tab-board")).toBeVisible()
    await expect(cedoliniPage.getByTestId("cedolini-mode-tab-controlli")).toBeVisible()
    await expect(cedoliniPage.getByTestId("cedolini-mode-tab-pagamenti")).toBeVisible()
  })

  test("Controlli tab shows analysis panel", async () => {
    await switchToControlliTab(cedoliniPage)
    await expect(cedoliniPage.getByTestId("cedolini-controlli-pronti")).toBeVisible()
    await expect(cedoliniPage.getByTestId("cedolini-controlli-warning")).toBeVisible()
  })

  test("Pagamenti tab shows reminder columns", async () => {
    await switchToPagamentiTab(cedoliniPage)
    await expect(cedoliniPage.getByTestId("cedolini-pagamenti-da-fare")).toBeVisible()
    await expect(cedoliniPage.getByTestId("cedolini-pagamenti-fatti")).toBeVisible()
  })

  test("switching back to Board restores the kanban", async () => {
    await switchToBoardTab(cedoliniPage)
    await ensureCedoliniFixtureMonth(cedoliniPage)
    await expect(
      cedoliniPage.locator('[data-testid="cedolini-search-input"]'),
    ).toBeVisible()
  })

  test("reload preserves mode and month in the URL", async () => {
    await gotoCedoliniWithMode(cedoliniPage, "controlli", E2E_CEDOLINI.fixedMonth)
    await expect(cedoliniPage).toHaveURL(/mode=controlli/)
    await expect(cedoliniPage).toHaveURL(/month=2026-06/)

    await cedoliniPage.reload()
    await expect(cedoliniPage.getByTestId("cedolini-controlli-avvia")).toBeVisible({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    await expect(cedoliniPage.getByText(new RegExp(E2E_CEDOLINI.monthLabel, "i"))).toBeVisible()
  })
})
