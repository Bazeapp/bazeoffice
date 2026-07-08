import { expect, test } from "@playwright/test"

import { E2E_FAMIGLIA, E2E_PIPELINE } from "../constants"
import {
  applyAdvancedFilters,
  clearAnagraficheSearch,
  gotoAnagrafiche,
  openAdvancedFilters,
  resetAdvancedFilters,
  setAnagraficheSearch,
  switchAnagraficheTab,
} from "../support/anagrafiche"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: filters", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await gotoAnagrafiche(page)
    await switchAnagraficheTab(page, "famiglie")
  })

  test("free-text search narrows famiglie and clearing restores rows", async ({ page }) => {
    await setAnagraficheSearch(page, "Bianchi")
    await expect(page.getByText(E2E_PIPELINE.famiglie.bianchi.displayName)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(E2E_FAMIGLIA.displayName)).toHaveCount(0)

    await clearAnagraficheSearch(page)
    await setAnagraficheSearch(page, E2E_FAMIGLIA.searchText)
    await expect(page.getByText(E2E_FAMIGLIA.displayName)).toBeVisible({ timeout: 30_000 })
    await setAnagraficheSearch(page, E2E_PIPELINE.famiglie.bianchi.searchText)
    await expect(page.getByText(E2E_PIPELINE.famiglie.bianchi.displayName)).toBeVisible({
      timeout: 30_000,
    })
  })

  test("advanced query builder apply and reset controls", async ({ page }) => {
    await switchAnagraficheTab(page, "lavoratori")
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({
      timeout: 30_000,
    })

    await openAdvancedFilters(page)
    await expect(page.locator(".query-builder-shell")).toBeVisible({ timeout: 10_000 })
    await applyAdvancedFilters(page)
    await resetAdvancedFilters(page)
    await expect(page.locator(selectors.anagrafiche.loadError)).toHaveCount(0)
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({
      timeout: 30_000,
    })
  })
})
