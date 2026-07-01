import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_ASSUNZIONI,
  E2E_ASSUNZIONI_VISIBLE_FIXTURE_IDS,
  assunzioniStageTestId,
} from "../constants"
import { dropPayloadOnSelector } from "./drag-and-drop"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(selectors.assunzioni.column(assunzioniStageTestId(stageLabel)))
}

export function getCard(page: Page, rapportoId: string): Locator {
  return page.locator(selectors.assunzioni.card(rapportoId))
}

export async function countVisibleAssunzioniFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_ASSUNZIONI_VISIBLE_FIXTURE_IDS.map((rapportoId) =>
      getCard(page, rapportoId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectAssunzioniCardVisibility(
  page: Page,
  rapportoId: string,
  visible: boolean,
) {
  const card = getCard(page, rapportoId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleAssunzioniFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleAssunzioniFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoAssunzioni(page: Page) {
  await page.goto(selectors.routes.assunzioni)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.assunzioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.assunzioni.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, E2E_ASSUNZIONI.stages.avviarePratica)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadAssunzioni(page: Page) {
  await page.goto(selectors.routes.assunzioni)
  await expect(
    page.getByRole("heading", { name: selectors.assunzioni.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(getColumn(page, E2E_ASSUNZIONI.stages.avviarePratica)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.assunzioni.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.assunzioni.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function openCardSheet(page: Page, rapportoId: string) {
  const card = getCard(page, rapportoId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.assunzioni.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.assunzioni.sheetDialog)).toHaveCount(0)
}

export async function waitForAssunzioniDetail(page: Page) {
  await expect(page.getByText("Contesto pratica", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export function assunzioneSheetDialog(page: Page) {
  return page.locator(selectors.assunzioni.sheetDialog)
}

export function assunzioneSheetLabeledInput(page: Page, label: string) {
  return assunzioneSheetDialog(page)
    .getByText(label, { exact: true })
    .locator("xpath=..")
    .locator("input, textarea")
    .first()
}

export async function waitForAssunzioneUpdateRecord(page: Page) {
  await page.waitForResponse(
    (response) =>
      (response.url().includes("/functions/v1/update-record") ||
        response.url().includes("/functions/v1/create-record")) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: BOARD_LOAD_TIMEOUT_MS },
  )
}

export async function dragCardToColumn(
  page: Page,
  rapportoId: string,
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
    selectors.assunzioni.column(assunzioniStageTestId(targetStageLabel)),
    rapportoId,
    selectors.assunzioni.card(rapportoId),
  )
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  rapportoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.assunzioni.card(rapportoId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  rapportoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.assunzioni.card(rapportoId)),
  ).toHaveCount(0)
}

export async function loadDeferredColumn(page: Page, stageLabel: string) {
  const column = getColumn(page, stageLabel)
  await column.scrollIntoViewIfNeeded()
  const loadButton = column.getByRole("button", { name: "Carica processi" })
  await loadButton.click()
  await expect(loadButton).toHaveCount(0, { timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function setStatoAssunzioneInSheet(
  page: Page,
  statoLabel: string,
  options: { expectUpdate?: boolean } = {},
) {
  const { expectUpdate = true } = options
  const dialog = page.locator(selectors.assunzioni.sheetDialog)
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

  const statoField = dialog.getByText("Stato assunzione", { exact: true }).locator("..")
  await statoField.getByRole("combobox").click()
  await page.getByRole("option", { name: statoLabel, exact: true }).click()
  if (updateResponse) {
    await updateResponse
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}
