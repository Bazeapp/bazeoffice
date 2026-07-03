import { expect, type Locator, type Page } from "@playwright/test"

import { E2E_PIPELINE } from "../constants"
import { dropPayloadOnSelector } from "./drag-and-drop"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const BOARD_APPLY_RESPONSE_TIMEOUT_MS = 5_000

export const PIPELINE_FILTERS_STORAGE_KEY =
  "bazeoffice.crmPipelineFamiglie.filters.v1"

function isPipelineBoardResponse(response: { url: () => string; ok: () => boolean }) {
  return response.url().includes("crm_pipeline_famiglie_board") && response.ok()
}

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
  const visibility = await Promise.all(
    ALL_PIPELINE_PROCESS_IDS.map((processId) => getCard(page, processId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectE2eFixtureCardsVisible(page: Page, processIds: string[]) {
  await Promise.all(
    processIds.map((processId) =>
      expect(getCard(page, processId)).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS }),
    ),
  )
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

/** Clears persisted pipeline filters before each navigation (including reload). */
export async function installCleanPipelineFiltersStorage(page: Page) {
  const storageKey = JSON.stringify(PIPELINE_FILTERS_STORAGE_KEY)
  await page.addInitScript(`() => { window.localStorage.removeItem(${storageKey}) }`)
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

export async function reloadPipeline(page: Page) {
  await page.reload()
  await expect(page.getByRole("heading", { name: selectors.pipeline.heading })).toBeVisible({
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

export async function applyFilters(
  page: Page,
  options: { waitForBoard?: boolean } = {},
) {
  const { waitForBoard = true } = options
  const applyButton = page.locator(selectors.pipeline.applyFilters)
  if (!(await applyButton.isEnabled())) {
    return
  }

  const boardResponse = waitForBoard
    ? page
        .waitForResponse(isPipelineBoardResponse, {
          timeout: BOARD_APPLY_RESPONSE_TIMEOUT_MS,
        })
        .catch(() => null)
    : null
  await applyButton.click()
  if (boardResponse) {
    await boardResponse
  }
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

/** Native HTML5 drag-and-drop (KanbanColumnShell onDrop → moveCard). */
export async function dragCardToColumn(
  page: Page,
  processId: string,
  targetStageId: string,
) {
  const card = getCard(page, processId)
  const column = getColumn(page, targetStageId)

  await card.scrollIntoViewIfNeeded()
  await column.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await dropPayloadOnSelector(
    page,
    selectors.pipeline.column(targetStageId),
    processId,
    selectors.pipeline.card(processId),
  )
  await updateResponse
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
