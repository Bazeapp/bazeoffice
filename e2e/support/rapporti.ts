import { expect, type Locator, type Page } from "@playwright/test"

import { E2E_RAPPORTI, rapportiIdsWithStatoRapporto } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 800

const ALL_RAPPORTO_IDS = Object.values(E2E_RAPPORTI.rapporti).map((rapporto) => rapporto.id)

export const E2E_RAPPORTI_FIXTURE_COUNT = ALL_RAPPORTO_IDS.length

export function getRapportoCard(page: Page, rapportoId: string): Locator {
  return page.locator(selectors.rapporti.card(rapportoId))
}

export async function countVisibleRapportiFixtureCards(page: Page) {
  const visibility = await Promise.all(
    ALL_RAPPORTO_IDS.map((rapportoId) => getRapportoCard(page, rapportoId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectRapportoCardVisibility(
  page: Page,
  rapportoId: string,
  visible: boolean,
) {
  const card = getRapportoCard(page, rapportoId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleRapportiFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleRapportiFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

function listPanel(page: Page) {
  return page.locator(selectors.rapporti.searchInput).locator("xpath=ancestor::div[contains(@class,'flex')][1]")
}

export async function gotoRapporti(page: Page, rapportoId?: string) {
  const path = rapportoId
    ? `${selectors.routes.rapportiLavorativi}/${encodeURIComponent(rapportoId)}`
    : selectors.routes.rapportiLavorativi

  await page.goto(path)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.rapporti.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.rapporti.statusFilter)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadRapporti(page: Page) {
  await gotoRapporti(page)
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.rapporti.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.rapporti.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

async function selectDropdownOption(page: Page, label: string) {
  await page.getByRole("option", { name: label, exact: true }).click()
}

export async function setStatoRapportoFilter(
  page: Page,
  value: "all" | (typeof E2E_RAPPORTI.statoRapporto)[keyof typeof E2E_RAPPORTI.statoRapporto],
) {
  await page.locator(selectors.rapporti.statusFilter).click()
  await selectDropdownOption(page, value === "all" ? "Tutti" : value)
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function resetStatoRapportoFilter(page: Page) {
  const resetButton = page.locator(selectors.rapporti.resetFilters)
  if (await resetButton.isVisible()) {
    await resetButton.click()
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
    return
  }
  await setStatoRapportoFilter(page, "all")
}

export async function applyLocalFilters(page: Page) {
  const applyButton = page.getByRole("button", { name: "Applica filtri" })
  if (await applyButton.isEnabled()) {
    await applyButton.click()
  }
}

export async function selectRapportoCard(page: Page, rapportoId: string) {
  const card = getRapportoCard(page, rapportoId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
}

export function rapportoDetailHeading(page: Page, title: string | RegExp) {
  return page.getByRole("heading", { name: title })
}

export function rapportoDetailTab(page: Page, label: string) {
  return page.getByRole("tab", { name: label, exact: true })
}

export function rapportoDetailPanel(page: Page) {
  return page
    .locator("section.bg-surface-muted")
    .filter({ has: page.getByRole("tab", { name: "Contratto", exact: true }) })
}

export function rapportoDetailSection(page: Page, title: string) {
  return rapportoDetailPanel(page)
    .locator("[class*='rounded-xl']")
    .filter({ has: page.getByText(title, { exact: true }) })
    .first()
}

export async function scrollToRapportoDetailTab(page: Page, label: string) {
  await rapportoDetailTab(page, label).click()
}

export async function openRapportoContrattoEdit(page: Page) {
  await rapportoDetailPanel(page)
    .getByRole("button", { name: "Modifica caratteristiche del rapporto", exact: true })
    .click()
}

export function rapportoDetailLabeledInput(page: Page, label: string) {
  return rapportoDetailPanel(page)
    .getByText(label, { exact: true })
    .locator("xpath=..")
    .locator("input, textarea")
    .first()
}

export async function waitForRapportoUpdateRecord(page: Page) {
  await page.waitForResponse(
    (response) =>
      (response.url().includes("/functions/v1/update-record") ||
        response.url().includes("/functions/v1/create-record")) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 15_000 },
  )
}

export async function expectFixtureVisibilityForStatoRapporto(
  page: Page,
  stato: (typeof E2E_RAPPORTI.statoRapporto)[keyof typeof E2E_RAPPORTI.statoRapporto],
) {
  const matchingIds = rapportiIdsWithStatoRapporto(stato)
  const otherIds = ALL_RAPPORTO_IDS.filter((id) => !matchingIds.includes(id))

  for (const rapportoId of matchingIds) {
    await expectRapportoCardVisibility(page, rapportoId, true)
  }
  for (const rapportoId of otherIds) {
    await expectRapportoCardVisibility(page, rapportoId, false)
  }
}

export async function waitForRapportoDetail(page: Page) {
  await expect(page.getByRole("tab", { name: "Contratto", exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export { listPanel }
