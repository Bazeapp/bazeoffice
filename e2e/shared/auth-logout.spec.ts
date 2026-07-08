import { expect, test } from "@playwright/test"

import { expectLoginForm, logoutFromSidebar } from "../support/auth"
import { selectors } from "../support/selectors"

test.describe("authentication: logout", () => {
  test.describe.configure({ timeout: 60_000 })

  test("logout returns to the login screen and stays logged out after reload", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })

    await logoutFromSidebar(page)
    await page.reload()
    await expectLoginForm(page)
  })
})
