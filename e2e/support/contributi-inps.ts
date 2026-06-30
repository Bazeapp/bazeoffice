import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_CONTRIBUTI_INPS,
  E2E_CONTRIBUTI_INPS_VISIBLE_FIXTURE_IDS,
  contributiInpsStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400
const QUARTER_NAV_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(
    selectors.contributiInps.column(contributiInpsStageTestId(stageLabel)),
  )
}

export function getCard(page: Page, contributoId: string): Locator {
  return page.locator(selectors.contributiInps.card(contributoId))
}

export async function countVisibleContributiInpsFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_CONTRIBUTI_INPS_VISIBLE_FIXTURE_IDS.map((contributoId) =>
      getCard(page, contributoId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectContributiInpsCardVisibility(
  page: Page,
  contributoId: string,
  visible: boolean,
) {
  const card = getCard(page, contributoId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleContributiInpsFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleContributiInpsFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function ensureContributiInpsFixtureQuarter(page: Page) {
  const anchorCard = getCard(page, E2E_CONTRIBUTI_INPS.contributi.daRichiedere.id)
  const quarterPattern = new RegExp(E2E_CONTRIBUTI_INPS.quarterLabel, "i")

  for (let step = 0; step < 8; step += 1) {
    if (await anchorCard.isVisible()) return
    if (await page.getByText(quarterPattern).first().isVisible()) {
      await expect(anchorCard).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
      return
    }
    await page.getByRole("button", { name: "Trimestre precedente" }).click()
    await page.waitForTimeout(QUARTER_NAV_MS)
  }

  for (let step = 0; step < 16; step += 1) {
    if (await anchorCard.isVisible()) return
    await page.getByRole("button", { name: "Trimestre successivo" }).click()
    await page.waitForTimeout(QUARTER_NAV_MS)
  }

  throw new Error("E2E contributi INPS fixtures not visible after quarter navigation")
}

export async function gotoContributiInps(page: Page) {
  await page.goto(selectors.routes.contributiInps)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.contributiInps.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.contributiInps.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await ensureContributiInpsFixtureQuarter(page)
  await expect(getColumn(page, E2E_CONTRIBUTI_INPS.stages.daRichiedere)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadContributiInps(page: Page) {
  await page.goto(selectors.routes.contributiInps)
  await expect(
    page.getByRole("heading", { name: selectors.contributiInps.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await ensureContributiInpsFixtureQuarter(page)
  await expect(getColumn(page, E2E_CONTRIBUTI_INPS.stages.daRichiedere)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.contributiInps.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.contributiInps.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function setStageFilter(page: Page, stageLabel: string) {
  await page.locator(selectors.contributiInps.stageFilter).click()
  await page.getByRole("option", { name: stageLabel, exact: true }).click()
}

export async function clearStageFilter(page: Page) {
  await page.locator(selectors.contributiInps.stageFilter).click()
  await page.getByRole("option", { name: "Tutti gli stati", exact: true }).click()
}

export async function resetFilters(page: Page) {
  const resetButton = page.getByRole("button", { name: "Reset filtri" })
  if (await resetButton.isVisible()) {
    await resetButton.click()
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
    return
  }
  await clearSearchQuery(page)
  await clearStageFilter(page)
}

export async function openCardSheet(page: Page, contributoId: string) {
  const card = getCard(page, contributoId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.contributiInps.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.contributiInps.sheetDialog)).toHaveCount(0)
}

export async function waitForContributoInpsDetail(page: Page) {
  await expect(page.getByText("Contributo INPS", { exact: true }).first()).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function dragCardToColumn(
  page: Page,
  contributoId: string,
  targetStageLabel: string,
) {
  const column = getColumn(page, targetStageLabel)
  await column.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await column.drop({ data: { "text/plain": contributoId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  contributoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.contributiInps.card(contributoId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  contributoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.contributiInps.card(contributoId)),
  ).toHaveCount(0)
}

export async function setStatoContributoInSheet(page: Page, targetStageLabel: string) {
  const dialog = page.locator(selectors.contributiInps.sheetDialog)
  await dialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: targetStageLabel, exact: true }).click()
}
