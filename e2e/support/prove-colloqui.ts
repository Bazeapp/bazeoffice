import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_PROVE_COLLOQUI,
  E2E_PROVE_COLLOQUI_VISIBLE_FIXTURE_IDS,
  proveColloquiStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export function getColumn(page: Page, stageLabel: string): Locator {
  return page.locator(selectors.proveColloqui.column(proveColloquiStageTestId(stageLabel)))
}

export function getCard(page: Page, rapportoId: string): Locator {
  return page.locator(selectors.proveColloqui.card(rapportoId))
}

export function getCalendarEvent(page: Page, eventDomId: string): Locator {
  return page.locator(selectors.proveColloqui.calendarEvent(eventDomId))
}

export async function countVisibleProveFixtureCards(page: Page) {
  const visibility = await Promise.all(
    E2E_PROVE_COLLOQUI_VISIBLE_FIXTURE_IDS.map((rapportoId) =>
      getCard(page, rapportoId).isVisible(),
    ),
  )
  return visibility.filter(Boolean).length
}

export async function expectProveCardVisibility(
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

export async function expectVisibleProveFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleProveFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoProveColloqui(page: Page) {
  await page.goto(selectors.routes.proveColloqui)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.proveColloqui.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.proveColloqui.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    getColumn(page, E2E_PROVE_COLLOQUI.stages.chiamareFamigliaPreProva),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expectVisibleProveFixtureCount(page, 3)
}

export async function reloadProveColloqui(page: Page) {
  await page.goto(selectors.routes.proveColloqui)
  await expect(
    page.getByRole("heading", { name: selectors.proveColloqui.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(
    getColumn(page, E2E_PROVE_COLLOQUI.stages.chiamareFamigliaPreProva),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.proveColloqui.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.proveColloqui.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function switchToColloquiTab(page: Page) {
  await page.getByRole("tab", { name: "Colloqui" }).click()
  await expect(page.getByRole("button", { name: "Oggi" })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function switchToProveTab(page: Page) {
  await page.getByRole("tab", { name: "Prove" }).click()
  await expect(
    getColumn(page, E2E_PROVE_COLLOQUI.stages.chiamareFamigliaPreProva),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function openProvaSheet(page: Page, rapportoId: string) {
  const card = getCard(page, rapportoId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.proveColloqui.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function openColloquioEvent(page: Page, eventDomId: string) {
  const event = getCalendarEvent(page, eventDomId)
  await event.scrollIntoViewIfNeeded()
  await event.click()
  const dialog = page.locator(selectors.proveColloqui.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeSheet(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.locator(selectors.proveColloqui.sheetDialog)).toHaveCount(0)
}

export async function waitForProvaDetail(page: Page) {
  await expect(page.getByText("Rapporto", { exact: true }).first()).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function expectCardInColumn(
  page: Page,
  rapportoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.proveColloqui.card(rapportoId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  rapportoId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, stageLabel).locator(selectors.proveColloqui.card(rapportoId)),
  ).toHaveCount(0)
}

export async function setStatoProvaInSheet(page: Page, statoLabel: string) {
  const dialog = page.locator(selectors.proveColloqui.sheetDialog)
  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  const statoField = dialog.getByText("Stato CS Prova", { exact: true }).locator("..")
  await statoField.getByRole("combobox").click()
  await page.getByRole("option", { name: statoLabel, exact: true }).click()
  if (updateResponse) {
    await updateResponse
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}
