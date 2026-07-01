import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_CEDOLINI,
  E2E_CEDOLINI_VISIBLE_FIXTURE_IDS,
  cedoliniStageTestId,
} from "../constants"
import { dropPayloadOnSelector } from "./drag-and-drop"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400
const MONTH_NAV_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(selectors.cedolini.column(cedoliniStageTestId(stageLabel)))
}

export function getCard(page: Page, cedolinoId: string): Locator {
  return page.locator(selectors.cedolini.card(cedolinoId))
}

export async function countVisibleCedoliniFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_CEDOLINI_VISIBLE_FIXTURE_IDS.map((cedolinoId) =>
      getCard(page, cedolinoId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectCedoliniCardVisibility(
  page: Page,
  cedolinoId: string,
  visible: boolean,
) {
  const card = getCard(page, cedolinoId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleCedoliniFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleCedoliniFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function ensureCedoliniFixtureMonth(page: Page) {
  const anchorCard = getCard(page, E2E_CEDOLINI.cedolini.todo.id)
  const monthPattern = new RegExp(E2E_CEDOLINI.monthLabel, "i")

  for (let step = 0; step < 24; step += 1) {
    if (await anchorCard.isVisible()) return
    if (await page.getByText(monthPattern).first().isVisible()) {
      await expect(anchorCard).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
      return
    }
    await page.getByRole("button", { name: "Mese precedente" }).click()
    await page.waitForTimeout(MONTH_NAV_MS)
  }

  for (let step = 0; step < 48; step += 1) {
    if (await anchorCard.isVisible()) return
    await page.getByRole("button", { name: "Mese successivo" }).click()
    await page.waitForTimeout(MONTH_NAV_MS)
  }

  throw new Error("E2E cedolini fixtures not visible after month navigation")
}

export async function gotoCedolini(page: Page) {
  await page.goto(selectors.routes.cedolini)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.cedolini.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.cedolini.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await ensureCedoliniFixtureMonth(page)
  await expect(getColumn(page, E2E_CEDOLINI.stages.todo)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadCedolini(page: Page) {
  await page.goto(selectors.routes.cedolini)
  await expect(
    page.getByRole("heading", { name: selectors.cedolini.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await ensureCedoliniFixtureMonth(page)
  await expect(getColumn(page, E2E_CEDOLINI.stages.todo)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.cedolini.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.cedolini.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openCardSheet(page: Page, cedolinoId: string) {
  const card = getCard(page, cedolinoId)
  await card.scrollIntoViewIfNeeded()

  const detailResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/rpc/cedolino_detail") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await card.click()
  const dialog = page.locator(selectors.cedolini.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  if (detailResponse) {
    await detailResponse
  }
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.cedolini.sheetDialog)).toHaveCount(0)
}

export async function waitForCedolinoDetail(page: Page) {
  await expect(page.getByText("Dettagli rapporto", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function waitForCedolinoPresenzeSection(page: Page) {
  const dialog = page.locator(selectors.cedolini.sheetDialog)
  await dialog.getByText("Presenze", { exact: true }).scrollIntoViewIfNeeded()
  await expect(dialog.getByText("Presenze regolari?", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function dragCardToColumn(
  page: Page,
  cedolinoId: string,
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

  await dropPayloadOnSelector(
    page,
    selectors.cedolini.column(cedoliniStageTestId(targetStageLabel)),
    cedolinoId,
    selectors.cedolini.card(cedolinoId),
  )
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  cedolinoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.cedolini.card(cedolinoId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  cedolinoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.cedolini.card(cedolinoId)),
  ).toHaveCount(0)
}

export async function setStatoCedolinoInSheet(page: Page, targetStageLabel: string) {
  const dialog = page.locator(selectors.cedolini.sheetDialog)
  await dialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: targetStageLabel, exact: true }).click()
}
