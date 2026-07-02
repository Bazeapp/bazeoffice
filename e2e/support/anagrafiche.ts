import { expect, type Page } from "@playwright/test"

import { E2E_FAMIGLIA, E2E_PIPELINE } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 700

export const ANAGRAFICHE_TABS = [
  { id: "famiglie", label: "Famiglie", fixtureText: E2E_FAMIGLIA.searchText },
  { id: "processi", label: "Processi", fixtureText: "Colf / Pulizie" },
  { id: "lavoratori", label: "Lavoratori", fixtureText: "Lavoratore Rossi" },
  { id: "mesi_lavorati", label: "Mesi lavorati", fixtureText: "Famiglia Rossi" },
  { id: "pagamenti", label: "Pagamenti", fixtureText: "Famiglia" },
  { id: "selezioni_lavoratori", label: "Selezioni lavoratori", fixtureText: "Lavoratore" },
  { id: "rapporti_lavorativi", label: "Rapporti lavorativi", fixtureText: "Famiglia Rossi" },
] as const

export async function gotoAnagrafiche(page: Page) {
  await page.goto(selectors.routes.home)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.anagrafiche.tab("famiglie"))).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function switchAnagraficheTab(page: Page, tabId: string) {
  await page.locator(selectors.anagrafiche.tab(tabId)).click()
  await expect(page.locator(selectors.anagrafiche.tab(tabId))).toHaveAttribute(
    "data-state",
    "active",
  )
}

export async function setAnagraficheSearch(page: Page, query: string) {
  const input = page.locator(selectors.anagrafiche.searchInput)
  await input.fill(query)
  if (query.length > 0) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearAnagraficheSearch(page: Page) {
  await page.locator(selectors.anagrafiche.searchInput).fill("")
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function expectAnagraficheRowVisible(page: Page, rowId: string, visible: boolean) {
  const row = page.locator(selectors.anagrafiche.row(rowId))
  if (visible) {
    await expect(row).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(row).toHaveCount(0)
  }
}

export async function openAnagraficheRow(page: Page, rowId: string) {
  const row = page.locator(selectors.anagrafiche.row(rowId))
  if ((await row.count()) > 0) {
    await expect(row).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
    await row.click()
  } else {
    await page.locator(".ag-center-cols-container .ag-row").first().click()
  }
  await expect(page.locator(selectors.anagrafiche.recordSheet)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function openAnagraficheRowByText(page: Page, text: string) {
  await setAnagraficheSearch(page, text)
  await page.getByText(text, { exact: false }).first().click()
  await expect(page.locator(selectors.anagrafiche.recordSheet)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function closeAnagraficheRecordSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.anagrafiche.recordSheet)).toHaveCount(0)
}

export async function openAdvancedFilters(page: Page) {
  await page.locator(selectors.anagrafiche.openFilters).click()
  await expect(page.locator(selectors.anagrafiche.applyFilters)).toBeVisible()
}

export async function applyAdvancedFilters(page: Page) {
  await page.locator(selectors.anagrafiche.applyFilters).click()
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function resetAdvancedFilters(page: Page) {
  await page.locator(selectors.anagrafiche.resetFilters).click()
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openGroupByControl(page: Page) {
  await page.locator(selectors.anagrafiche.groupBy).click()
}

export function famigliaFixtureIds() {
  return [E2E_FAMIGLIA.id, E2E_PIPELINE.famiglie.bianchi.id]
}
