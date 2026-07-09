import { expect, test } from "@playwright/test"

import { interceptRpc } from "../support/route-errors"
import { selectors } from "../support/selectors"

test.describe("cedolini: board load failure", () => {
  test.describe.configure({ timeout: 60_000 })

  test("shows an error banner when the board rpc fails", async ({ page }) => {
    await interceptRpc(page, "cedolini_board", 500)
    await page.goto(selectors.routes.cedolini)
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })

    await expect(page.getByText("Errore caricamento payroll", { exact: false })).toBeVisible({
      timeout: 30_000,
    })
  })
})
