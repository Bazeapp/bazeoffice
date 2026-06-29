import { expect, test } from "@playwright/test"

import { selectors } from "./support/selectors"

test.describe("authenticated app shell", () => {
  test("loads without login form", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator(selectors.loginEmail)).toHaveCount(0)
    await expect(page.getByText(selectors.sessionLoadingText)).toHaveCount(0)
    await expect(page.locator(selectors.appSidebar)).toBeVisible({
      timeout: 30_000,
    })
  })
})
