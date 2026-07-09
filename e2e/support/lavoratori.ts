import { expect, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 700

const ALL_LAVORATORE_IDS = Object.values(E2E_LAVORATORI.lavoratori).map(
  (lavoratore) => lavoratore.id,
)

export const E2E_LAVORATORI_FIXTURE_COUNT = ALL_LAVORATORE_IDS.length

export function getWorkerCard(page: Page, workerId: string) {
  return page.locator(selectors.lavoratori.card(workerId))
}

export async function countVisibleLavoratoreFixtureCards(page: Page) {
  const visibility = await Promise.all(
    ALL_LAVORATORE_IDS.map((workerId) => getWorkerCard(page, workerId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectLavoratoreCardVisibility(
  page: Page,
  workerId: string,
  visible: boolean,
) {
  const card = getWorkerCard(page, workerId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleLavoratoreFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleLavoratoreFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

function gateListPanel(page: Page) {
  return page.locator(selectors.lavoratori.listPanel)
}

function listPanelSelect(page: Page, fieldLabel: string) {
  return gateListPanel(page)
    .locator("div.space-y-1")
    .filter({ has: page.getByText(fieldLabel, { exact: true }) })
    .getByRole("combobox")
}

export function workerDetailTab(page: Page, label: string) {
  return page.getByRole("tab", { name: label, exact: true })
}

export function workerDetailPanel(page: Page) {
  return page
    .locator("section.bg-surface-muted")
    .filter({ has: page.locator(selectors.lavoratori.closeDetail) })
}

export function workerDetailHeading(page: Page, name: string) {
  return page.locator("h2").filter({ hasText: name })
}

export function workerDetailSection(page: Page, title: string) {
  return workerDetailPanel(page)
    .locator("[class*='rounded-xl']")
    .filter({ has: page.getByText(title, { exact: true }) })
    .first()
}

export async function scrollToWorkerDetailTab(page: Page, label: string) {
  await workerDetailTab(page, label).click()
}

export async function openWorkerSectionEdit(page: Page, buttonName: string) {
  await workerDetailPanel(page)
    .getByRole("button", { name: buttonName, exact: true })
    .click()
}

export function workerDetailLabeledInput(page: Page, label: string) {
  return workerDetailPanel(page)
    .locator("div.space-y-1, div.space-y-2")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("input, textarea")
    .first()
}

export async function waitForLavoratoreUpdateRecord(page: Page) {
  await page.waitForResponse(
    (response) =>
      (response.url().includes("/functions/v1/update-record") ||
        response.url().includes("/functions/v1/create-record")) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 15_000 },
  )
}

async function selectDropdownOption(page: Page, label: string) {
  await page.getByRole("option", { name: label, exact: true }).click()
}

export async function gotoCercaLavoratori(page: Page) {
  await page.goto(selectors.routes.cercaLavoratori)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.lavoratori.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function gotoGate1(page: Page) {
  await page.goto(selectors.routes.gate1)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("link", { name: "Colloquio Milano" })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function gotoGate2(page: Page) {
  await page.goto(selectors.routes.gate2)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("combobox").filter({ hasText: "Solo idonei" })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  const input = page.locator(selectors.lavoratori.searchInput)
  await input.fill(query)
  if (query.length > 0) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const input = page.locator(selectors.lavoratori.searchInput)
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await input.fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function setProvinciaFilter(page: Page, provinciaSigla: "all" | "MI" | "TO") {
  const label =
    provinciaSigla === "all"
      ? "Tutte le province"
      : provinciaSigla === "MI"
        ? "Milano"
        : "Torino"
  await listPanelSelect(page, "Provincia").click()
  await selectDropdownOption(page, label)
}

export async function setFollowupFilter(page: Page, followup: "all" | string) {
  const label = followup === "all" ? "Tutti i follow-up" : followup
  await listPanelSelect(page, "Follow-up").click()
  await selectDropdownOption(page, label)
}

export async function resetGateListFilters(page: Page) {
  const resetButton = page.locator(selectors.lavoratori.resetGateFilters)
  if (await resetButton.isVisible()) {
    await resetButton.click()
  }
}

function cercaAdvancedFiltersPanel(page: Page) {
  return page
    .locator("div.space-y-3")
    .filter({
      has: page.getByText("In this view, show rows where"),
    })
    .filter({
      has: page.getByRole("button", { name: "Add condition" }),
    })
    .first()
}

export async function openCercaAdvancedFilters(page: Page) {
  await page.getByRole("button", { name: /Filtri avanzati/i }).click()
  await expect(cercaAdvancedFiltersPanel(page)).toBeVisible({ timeout: 10_000 })
}

export async function addCercaTextFilterCondition(
  page: Page,
  value: string,
  fieldLabel?: string,
) {
  const panel = cercaAdvancedFiltersPanel(page)
  await panel.getByRole("button", { name: "Add condition", exact: true }).click()

  const conditionRow = panel.locator(".rounded-lg.border.bg-background").last()
  if (fieldLabel) {
    await conditionRow.getByRole("combobox").first().click()
    await page.getByRole("option", { name: fieldLabel, exact: true }).first().click()
  }
  await conditionRow.locator('input[placeholder="Valore"]').fill(value)
}

export async function applyCercaAdvancedFilters(page: Page) {
  const applyButton = page.getByRole("button", { name: "Applica filtri" })
  await expect(applyButton).toBeEnabled({ timeout: 5_000 })
  await applyButton.click()
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function clearCercaAdvancedFilterConditions(page: Page) {
  const panel = cercaAdvancedFiltersPanel(page)
  const trashButton = panel.locator(
    ".rounded-lg.border.bg-background div.flex.items-center.px-1 button",
  )

  while ((await trashButton.count()) > 0) {
    await trashButton.first().click()
  }
}

export async function setGate2StatusFilter(
  page: Page,
  option: "idonei" | "idonei_qualificati",
) {
  const label = option === "idonei" ? "Solo idonei" : "Idonei + qualificati"
  await listPanelSelect(page, "Stato Gate 2").click()
  await selectDropdownOption(page, label)
}

export async function openWorkerDetail(page: Page, workerId: string) {
  const card = getWorkerCard(page, workerId)
  await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await card.click()
  await expect(page.locator(selectors.lavoratori.closeDetail)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function closeWorkerDetail(page: Page) {
  await page.locator(selectors.lavoratori.closeDetail).click()
  await expect(page.locator(selectors.lavoratori.closeDetail)).toHaveCount(0)
}

export function gate1FixtureIds() {
  return getE2eLavoratoreIdsForGate1()
}

export function gate2IdoneiFixtureIds() {
  return Object.values(E2E_LAVORATORI.lavoratori)
    .filter((lavoratore) => lavoratore.inGate2Idonei)
    .map((lavoratore) => lavoratore.id)
}

export function gate2IdoneiQualificatiFixtureIds() {
  return Object.values(E2E_LAVORATORI.lavoratori)
    .filter((lavoratore) => lavoratore.inGate2IdoneiQualificati)
    .map((lavoratore) => lavoratore.id)
}

function getE2eLavoratoreIdsForGate1() {
  return Object.values(E2E_LAVORATORI.lavoratori)
    .filter((lavoratore) => lavoratore.inGate1)
    .map((lavoratore) => lavoratore.id)
}
