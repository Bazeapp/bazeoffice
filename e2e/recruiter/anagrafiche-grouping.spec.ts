import { expect, test } from "@playwright/test"

import { gotoAnagrafiche, openGroupByControl, switchAnagraficheTab } from "../support/anagrafiche"

test.describe("anagrafiche: grouping", () => {
  test.describe.configure({ timeout: 60_000 })

  test("group-by groups rows and expanding loads group rows", async ({ page }) => {
    await gotoAnagrafiche(page)
    await switchAnagraficheTab(page, "famiglie")

    await openGroupByControl(page)
    await page.getByRole("button", { name: "Add another group" }).click()
    await page.getByRole("button", { name: "Applica filtri" }).click()
    await page.waitForTimeout(700)

    const groupRow = page.locator(".ag-full-width-row").first()
    await expect(groupRow).toBeVisible({ timeout: 30_000 })
    await groupRow.click()
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({
      timeout: 30_000,
    })
  })
})
