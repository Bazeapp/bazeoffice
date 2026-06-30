import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_CHIUSURE,
  E2E_CHIUSURE_VISIBLE_FIXTURE_IDS,
  chiusureStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(selectors.chiusure.column(chiusureStageTestId(stageLabel)))
}

export function getCard(page: Page, chiusuraId: string): Locator {
  return page.locator(selectors.chiusure.card(chiusuraId))
}

export async function countVisibleChiusureFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_CHIUSURE_VISIBLE_FIXTURE_IDS.map((chiusuraId) =>
      getCard(page, chiusuraId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectChiusureCardVisibility(
  page: Page,
  chiusuraId: string,
  visible: boolean,
) {
  const card = getCard(page, chiusuraId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleChiusureFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleChiusureFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoChiusure(page: Page) {
  await page.goto(selectors.routes.chiusure)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.chiusure.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.chiusure.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    getColumn(page, E2E_CHIUSURE.stages.lavoratoreComunicaDimissioni),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function reloadChiusure(page: Page) {
  await page.goto(selectors.routes.chiusure)
  await expect(
    page.getByRole("heading", { name: selectors.chiusure.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(
    getColumn(page, E2E_CHIUSURE.stages.lavoratoreComunicaDimissioni),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.chiusure.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.chiusure.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openCardSheet(page: Page, chiusuraId: string) {
  const card = getCard(page, chiusuraId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.chiusure.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.chiusure.sheetDialog)).toHaveCount(0)
}

export async function waitForChiusureDetail(page: Page) {
  await expect(page.getByText("Dettagli chiusura", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function dragCardToColumn(
  page: Page,
  chiusuraId: string,
  targetStageLabel: string,
  options: { expectUpdate?: boolean } = {},
) {
  const { expectUpdate = true } = options
  const column = getColumn(page, targetStageLabel)
  await column.scrollIntoViewIfNeeded()

  const updateResponse = expectUpdate
    ? page
        .waitForResponse(
          (response) =>
            response.url().includes("/functions/v1/update-record") &&
            response.request().method() === "POST",
          { timeout: BOARD_LOAD_TIMEOUT_MS },
        )
        .catch(() => null)
    : null

  await column.drop({ data: { "text/plain": chiusuraId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  chiusuraId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.chiusure.card(chiusuraId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  chiusuraId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.chiusure.card(chiusuraId)),
  ).toHaveCount(0)
}

export async function setStatoChiusuraInSheet(
  page: Page,
  statoLabel: string,
  options: { expectUpdate?: boolean } = {},
) {
  const { expectUpdate = true } = options
  const dialog = page.locator(selectors.chiusure.sheetDialog)
  const updateResponse = expectUpdate
    ? page
        .waitForResponse(
          (response) =>
            response.url().includes("/functions/v1/update-record") &&
            response.request().method() === "POST",
          { timeout: BOARD_LOAD_TIMEOUT_MS },
        )
        .catch(() => null)
    : null

  await dialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: statoLabel, exact: true }).click()
  if (updateResponse) {
    await updateResponse
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openAnnullamentoDialog(page: Page) {
  await page.locator(selectors.chiusure.openAnnullamento).click()
  const dialog = page.locator(selectors.chiusure.annullamentoDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}
