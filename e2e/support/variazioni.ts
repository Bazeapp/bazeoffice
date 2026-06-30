import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_VARIAZIONI,
  E2E_VARIAZIONI_VISIBLE_FIXTURE_IDS,
  variazioniStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(selectors.variazioni.column(variazioniStageTestId(stageLabel)))
}

export function getCard(page: Page, variazioneId: string): Locator {
  return page.locator(selectors.variazioni.card(variazioneId))
}

export async function countVisibleVariazioniFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_VARIAZIONI_VISIBLE_FIXTURE_IDS.map((variazioneId) =>
      getCard(page, variazioneId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectVariazioniCardVisibility(
  page: Page,
  variazioneId: string,
  visible: boolean,
) {
  const card = getCard(page, variazioneId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleVariazioniFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleVariazioniFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoVariazioni(page: Page) {
  await page.goto(selectors.routes.variazioni)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.variazioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.variazioni.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, E2E_VARIAZIONI.stages.presaInCarico)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadVariazioni(page: Page) {
  await page.goto(selectors.routes.variazioni)
  await expect(
    page.getByRole("heading", { name: selectors.variazioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(getColumn(page, E2E_VARIAZIONI.stages.presaInCarico)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.variazioni.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.variazioni.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openCardSheet(page: Page, variazioneId: string) {
  const card = getCard(page, variazioneId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.variazioni.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.variazioni.sheetDialog)).toHaveCount(0)
}

export async function waitForVariazioniDetail(page: Page) {
  await expect(page.getByText("Dettagli variazione", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function dragCardToColumn(
  page: Page,
  variazioneId: string,
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

  await column.drop({ data: { "text/plain": variazioneId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  variazioneId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.variazioni.card(variazioneId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  variazioneId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.variazioni.card(variazioneId)),
  ).toHaveCount(0)
}

export async function openCreateDialog(page: Page) {
  await page.locator(selectors.variazioni.openCreate).click()
  const dialog = page.locator(selectors.variazioni.createDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}
