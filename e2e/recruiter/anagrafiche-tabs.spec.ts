import { expect, test } from "@playwright/test"

import {
  ANAGRAFICHE_TABS,
  gotoAnagrafiche,
  setAnagraficheSearch,
  switchAnagraficheTab,
} from "../support/anagrafiche"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: tabs", () => {
  test.describe.configure({ timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await gotoAnagrafiche(page)
  })

  const TABS_WITH_SEED = ANAGRAFICHE_TABS.filter(
    (tab) => tab.id !== "mesi_lavorati" && tab.id !== "pagamenti",
  )

  for (const tab of TABS_WITH_SEED) {
    test(`${tab.label} tab loads seeded rows`, async ({ page }) => {
      await switchAnagraficheTab(page, tab.id)
      await expect(page.locator(selectors.anagrafiche.loadError)).toHaveCount(0)
      if (tab.fixtureText) {
        await setAnagraficheSearch(page, tab.fixtureText)
      }
      await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({
        timeout: 30_000,
      })
    })
  }

  test("mesi lavorati and pagamenti tabs load without error", async ({ page }) => {
    for (const tabId of ["mesi_lavorati", "pagamenti"] as const) {
      await switchAnagraficheTab(page, tabId)
      await expect(page.locator(selectors.anagrafiche.loadError)).toHaveCount(0)
      await expect(page.locator(".ag-root")).toBeVisible({ timeout: 30_000 })
    }
  })

  test("column sorting reorders rows on famiglie", async ({ page }) => {
    await switchAnagraficheTab(page, "famiglie")
    const grid = page.locator(".ag-root")
    await expect(grid).toBeVisible({ timeout: 30_000 })

    const firstHeader = page.locator(".ag-header-cell").first()
    const before = await page.locator(".ag-center-cols-container .ag-row").first().innerText()

    await firstHeader.click()
    await page.waitForTimeout(700)

    const after = await page.locator(".ag-center-cols-container .ag-row").first().innerText()
    expect(after.length).toBeGreaterThan(0)
    expect(before).not.toEqual(after)
  })

  test("pagination advances when more than one page exists", async ({ page }) => {
    await switchAnagraficheTab(page, "famiglie")
    const nextButton = page.locator(selectors.anagrafiche.pageNext)
    if (!(await nextButton.isEnabled())) {
      test.skip(true, "Seed has fewer rows than one page — pagination not applicable")
    }

    const firstPageRow = await page.locator(".ag-center-cols-container .ag-row").first().innerText()
    await nextButton.click()
    await page.waitForTimeout(700)
    const secondPageRow = await page.locator(".ag-center-cols-container .ag-row").first().innerText()
    expect(secondPageRow).not.toEqual(firstPageRow)

    await page.locator(selectors.anagrafiche.pagePrevious).click()
    await page.waitForTimeout(700)
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toContainText(
      firstPageRow.slice(0, 20),
    )
  })
})
