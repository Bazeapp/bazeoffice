import { expect, test } from "@playwright/test"

import { E2E_FAMIGLIA } from "../constants"
import {
  closeAnagraficheRecordSheet,
  gotoAnagrafiche,
  openAnagraficheRowByText,
  switchAnagraficheTab,
} from "../support/anagrafiche"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: record sheet", () => {
  test.describe.configure({ timeout: 60_000 })

  test("opens with entity metadata and closes", async ({ page }) => {
    await gotoAnagrafiche(page)
    await switchAnagraficheTab(page, "famiglie")
    await openAnagraficheRowByText(page, E2E_FAMIGLIA.searchText)

    const sheet = page.locator(selectors.anagrafiche.recordSheet)
    await expect(sheet.getByText("Famiglia", { exact: true })).toBeVisible()
    await expect(sheet.getByText("E2E Famiglia Rossi", { exact: false })).toBeVisible()
    await expect(sheet.locator(".font-mono")).toContainText(E2E_FAMIGLIA.id)
    await expect(sheet.locator(".rounded-xl.border").first()).toBeVisible()

    await closeAnagraficheRecordSheet(page)
  })
})
