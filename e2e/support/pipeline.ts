import { expect, type Locator, type Page } from "@playwright/test"

import { E2E_PIPELINE } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
export const PIPELINE_FILTERS_STORAGE_KEY =
  "bazeoffice.crmPipelineFamiglie.filters.v1"

const ALL_PIPELINE_PROCESS_IDS = Object.values(E2E_PIPELINE.processi).map(
  (processo) => processo.id,
)

export const E2E_FIXTURE_CARD_COUNT = ALL_PIPELINE_PROCESS_IDS.length

export function toolbarCombobox(page: Page, label: string) {
  return page
    .locator("label")
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("combobox")
}

function toolbarFilterButton(page: Page, label: string) {
  return page
    .locator("label")
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("button")
}

export function allPipelineCards(page: Page) {
  return page.locator('[data-testid^="pipeline-card-"]')
}

export async function countVisibleE2eFixtureCards(page: Page) {
  let count = 0
  for (const processId of ALL_PIPELINE_PROCESS_IDS) {
    if (await getCard(page, processId).isVisible()) {
      count += 1
    }
  }
  return count
}

export async function expectVisibleE2eFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleE2eFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function expectE2eFixtureCardVisibility(
  page: Page,
  processId: string,
  visible: boolean,
) {
  const card = getCard(page, processId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function countVisiblePipelineCards(page: Page) {
  return allPipelineCards(page).count()
}

export async function clearPipelineFiltersStorage(page: Page) {
  await page.evaluate(
    `(key) => { window.localStorage.removeItem(key) }`,
    PIPELINE_FILTERS_STORAGE_KEY,
  )
}

/** @deprecated Prefer expectVisibleE2eFixtureCount — the local board also contains seed.sql rows. */
export async function expectPipelineCardCount(page: Page, expected: number) {
  await expect(allPipelineCards(page)).toHaveCount(expected, {
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setPreventivoFilter(
  page: Page,
  value: "all" | "yes" | "no",
) {
  const option =
    value === "yes" ? "Accettato" : value === "no" ? "Non accettato" : "Tutti"
  await toolbarCombobox(page, "Preventivo").click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

export async function setChiamataFilter(page: Page, value: "all" | "yes" | "no") {
  const option = value === "yes" ? "Sì" : value === "no" ? "No" : "Tutti"
  await toolbarCombobox(page, "Chiamata").click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

export async function setPeriodoPreset(page: Page, label: string) {
  await toolbarCombobox(page, "Periodo").click()
  await page.getByRole("option", { name: label, exact: true }).click()
}

export async function selectTipoLavoro(page: Page, label: string) {
  await toolbarFilterButton(page, "Tipo ricerca").click()
  await page.getByRole("menuitem", { name: label, exact: true }).click()
  await page.keyboard.press("Escape")
}

export async function selectAllTipoLavoro(page: Page) {
  await toolbarFilterButton(page, "Tipo ricerca").click()
  await page.getByRole("menuitem", { name: "Tutti", exact: true }).click()
  await page.keyboard.press("Escape")
}

export function processIdsWithPreventivoAccettato() {
  return ALL_PIPELINE_PROCESS_IDS.filter((id) => {
    const processo = Object.values(E2E_PIPELINE.processi).find((row) => row.id === id)
    return processo?.preventivoAccettato === true
  })
}

export function processIdsWithoutPreventivoAccettato() {
  return ALL_PIPELINE_PROCESS_IDS.filter((id) => {
    const processo = Object.values(E2E_PIPELINE.processi).find((row) => row.id === id)
    return processo?.preventivoAccettato !== true
  })
}

export function getColumn(page: Page, stageId: string): Locator {
  return page.locator(selectors.pipeline.column(stageId))
}

export function getCard(page: Page, processId: string): Locator {
  return page.locator(selectors.pipeline.card(processId))
}

export async function gotoPipeline(page: Page) {
  await page.goto(selectors.routes.pipeline)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("heading", { name: selectors.pipeline.heading })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.pipeline.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, E2E_PIPELINE.stages.warmLead)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function openCardSheet(page: Page, processId: string) {
  const card = getCard(page, processId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.pipeline.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.locator(selectors.pipeline.sheetClose).click()
  await expect(page.locator(selectors.pipeline.sheetDialog)).toHaveCount(0, {
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function applyFilters(page: Page) {
  const applyButton = page.locator(selectors.pipeline.applyFilters)
  if (!(await applyButton.isEnabled())) {
    return
  }

  const boardResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("crm_pipeline_famiglie_board") && response.ok(),
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)
  await applyButton.click()
  await boardResponse
}

export async function resetFilters(page: Page) {
  const resetButton = page.locator(selectors.pipeline.resetFilters)
  if (await resetButton.isVisible()) {
    await resetButton.click()
  }
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.pipeline.searchInput).fill(query)
}

export async function setStatoInSheet(
  page: Page,
  optionLabel: string,
  options: { expectUpdate?: boolean } = {},
) {
  const { expectUpdate = true } = options
  const dialog = page.locator(selectors.pipeline.sheetDialog)
  const updateResponse = expectUpdate
    ? page.waitForResponse(
        (response) =>
          response.url().includes("/functions/v1/update-record") &&
          response.request().method() === "POST",
        { timeout: BOARD_LOAD_TIMEOUT_MS },
      )
    : null
  await dialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: optionLabel, exact: true }).click()
  if (updateResponse) {
    await updateResponse
  }
}

export function expectPersistedStatoSales(
  persisted: string | null,
  stageId: string,
  stageLabel: string,
) {
  expect([stageId, stageLabel]).toContain(persisted)
}

/**
 * Synthetic native HTML5 drag-and-drop (best-effort). Dispatches dragstart/drop
 * with a shared DataTransfer carrying the process id as text/plain.
 */
export async function dragCardToColumn(
  page: Page,
  processId: string,
  targetStageId: string,
) {
  const cardSelector = selectors.pipeline.card(processId)
  const columnSelector = selectors.pipeline.column(targetStageId)

  await page.evaluate(
    `({ cardSel, columnSel, id }) => {
      const card = document.querySelector(cardSel)
      const column = document.querySelector(columnSel)
      if (!card || !column) {
        throw new Error(
          "dragCardToColumn: missing element (card=" + Boolean(card) + ", column=" + Boolean(column) + ")",
        )
      }

      const dataTransfer = new DataTransfer()
      dataTransfer.setData("text/plain", id)
      dataTransfer.effectAllowed = "move"

      const eventInit = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }

      card.dispatchEvent(new DragEvent("dragstart", eventInit))
      column.dispatchEvent(new DragEvent("dragenter", eventInit))
      column.dispatchEvent(new DragEvent("dragover", eventInit))
      column.dispatchEvent(new DragEvent("drop", eventInit))
      card.dispatchEvent(new DragEvent("dragend", eventInit))
    }`,
    { cardSel: cardSelector, columnSel: columnSelector, id: processId },
  )
}

export async function expectCardInColumn(
  page: Page,
  processId: string,
  stageId: string,
) {
  await expect(getColumn(page, stageId).locator(selectors.pipeline.card(processId))).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function expectCardNotInColumn(
  page: Page,
  processId: string,
  stageId: string,
) {
  await expect(getColumn(page, stageId).locator(selectors.pipeline.card(processId))).toHaveCount(0)
}
