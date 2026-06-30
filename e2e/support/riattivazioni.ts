import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_RIATTIVAZIONI,
  E2E_RIATTIVAZIONI_VISIBLE_FIXTURE_IDS,
  riattivazioniStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export function getColumn(page: Page, stageId: string): Locator {
  return page.locator(selectors.riattivazioni.column(riattivazioniStageTestId(stageId)))
}

export function getCard(page: Page, chiusuraId: string): Locator {
  return page.locator(selectors.riattivazioni.card(chiusuraId))
}

export async function countVisibleRiattivazioniFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_RIATTIVAZIONI_VISIBLE_FIXTURE_IDS.map((chiusuraId) =>
      getCard(page, chiusuraId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectRiattivazioniCardVisibility(
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

export async function expectVisibleRiattivazioniFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleRiattivazioniFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoRiattivazioni(page: Page) {
  await page.goto(selectors.routes.riattivazioni)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.riattivazioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.riattivazioni.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, E2E_RIATTIVAZIONI.stages.daSentire)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadRiattivazioni(page: Page) {
  await page.goto(selectors.routes.riattivazioni)
  await expect(
    page.getByRole("heading", { name: selectors.riattivazioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(getColumn(page, E2E_RIATTIVAZIONI.stages.daSentire)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.riattivazioni.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.riattivazioni.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openCardSheet(page: Page, chiusuraId: string) {
  const card = getCard(page, chiusuraId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.riattivazioni.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.riattivazioni.sheetDialog)).toHaveCount(0)
}

export async function waitForRiattivazioniDetail(page: Page) {
  await expect(page.getByText("Dati chiusura", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function dragCardToColumn(
  page: Page,
  chiusuraId: string,
  targetStageId: string,
) {
  const column = getColumn(page, targetStageId)
  await column.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await column.drop({ data: { "text/plain": chiusuraId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  chiusuraId: string,
  stageId: string,
) {
  await expect(
    getColumn(page, stageId).locator(selectors.riattivazioni.card(chiusuraId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  chiusuraId: string,
  stageId: string,
) {
  await expect(
    getColumn(page, stageId).locator(selectors.riattivazioni.card(chiusuraId)),
  ).toHaveCount(0)
}

export async function setStatoRiattivazioneInSheet(
  page: Page,
  stageLabel: string,
  options: { expectUpdate?: boolean } = {},
) {
  const { expectUpdate = true } = options
  const dialog = page.locator(selectors.riattivazioni.sheetDialog)
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
  await page.getByRole("option", { name: stageLabel, exact: true }).click()
  if (updateResponse) {
    await updateResponse
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}
