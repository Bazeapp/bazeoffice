import { expect, test } from "@playwright/test"

import { interceptRpc } from "../support/route-errors"
import { selectors } from "../support/selectors"

test.describe("ricerca: board load failure", () => {
  test.describe.configure({ timeout: 60_000 })

  test("shows an error banner when the board rpc fails", async ({ page }) => {
    await interceptRpc(page, "ricerca_board", 500)
    await page.goto(selectors.routes.ricerca)
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })

    await expect(page.getByText("Errore caricamento board ricerca", { exact: false })).toBeVisible({
      timeout: 30_000,
    })
  })
})
