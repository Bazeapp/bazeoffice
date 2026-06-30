import { expect, type Locator, type Page } from "@playwright/test"

import { E2E_ASSEGNAZIONE } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000

const ALL_ASSEGNAZIONE_PROCESS_IDS = Object.values(E2E_ASSEGNAZIONE.processi).map(
  (processo) => processo.id,
)

export const E2E_ASSEGNAZIONE_FIXTURE_COUNT = ALL_ASSEGNAZIONE_PROCESS_IDS.length

function startOfUtcDay(input: Date) {
  const date = new Date(input)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function addUtcDays(input: Date, days: number) {
  const date = new Date(input)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

export function toUtcDateKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getVisibleAssignmentDateKeys() {
  const windowStart = addUtcDays(startOfUtcDay(new Date()), -1)
  return Array.from({ length: 3 }).map((_, index) =>
    toUtcDateKey(addUtcDays(windowStart, index)),
  )
}

export function getTodayUtcDateKey() {
  return toUtcDateKey(startOfUtcDay(new Date()))
}

export function getTomorrowUtcDateKey() {
  return toUtcDateKey(addUtcDays(startOfUtcDay(new Date()), 1))
}

export function getCard(page: Page, processId: string): Locator {
  return page.locator(selectors.assegnazione.card(processId))
}

export function getDayColumn(page: Page, dateKey: string): Locator {
  return page.locator(selectors.assegnazione.dayColumn(dateKey))
}

export function getUnassignedPanel(page: Page): Locator {
  return page.locator(selectors.assegnazione.unassignedPanel)
}

export async function countVisibleAssegnazioneFixtureCards(page: Page) {
  const visibility = await Promise.all(
    ALL_ASSEGNAZIONE_PROCESS_IDS.map((processId) => getCard(page, processId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectAssegnazioneCardVisibility(
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

export async function expectVisibleAssegnazioneFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleAssegnazioneFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoAssegnazione(page: Page) {
  await page.goto(selectors.routes.assegnazione)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.assegnazione.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.getByText("Da assegnare", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByText("Giorni assegnazione", { exact: true })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadAssegnazione(page: Page) {
  await page.reload()
  await expect(
    page.getByRole("heading", { name: selectors.assegnazione.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

async function selectDropdownOption(page: Page, label: string) {
  await page.getByRole("option", { name: new RegExp(label, "i") }).first().click()
}

export async function setRecruiterFilter(
  page: Page,
  option: "all" | "none" | "recruiter" | "sales",
) {
  const label =
    option === "all"
      ? "Tutti i recruiter"
      : option === "none"
        ? "Non assegnato"
        : option === "recruiter"
          ? E2E_ASSEGNAZIONE.operatori.recruiter.displayName
          : E2E_ASSEGNAZIONE.operatori.sales.displayName

  await page.locator(selectors.assegnazione.filterRecruiter).click()
  await selectDropdownOption(page, label)
}

export async function setTipoRicercaFilter(
  page: Page,
  option: "all" | "nuova" | "sostituzione",
) {
  const label =
    option === "all"
      ? "Tutte le ricerche"
      : option === "nuova"
        ? "Nuove ricerche"
        : "Sostituzioni"

  await page.locator(selectors.assegnazione.filterTipoRicerca).click()
  await selectDropdownOption(page, label)
}

export async function resetAssegnazioneFilters(page: Page) {
  const resetButton = page.locator(selectors.assegnazione.resetFilters)
  if (await resetButton.isVisible()) {
    await resetButton.click()
  }
}

export async function openCardSheet(page: Page, processId: string) {
  const card = getCard(page, processId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(selectors.assegnazione.sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page) {
  await page.locator(selectors.assegnazione.sheetClose).click()
  await expect(page.locator(selectors.assegnazione.sheetDialog)).toHaveCount(0, {
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function assignRecruiterOnCard(
  page: Page,
  processId: string,
  recruiterLabel: string,
) {
  const card = getCard(page, processId)
  await card.getByRole("combobox", { name: "Cambia assegnatario" }).click()
  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)
  await selectDropdownOption(page, recruiterLabel)
  if (updateResponse) {
    await updateResponse
  }
}

export async function dragCardToDay(page: Page, processId: string, dateKey: string) {
  const column = getDayColumn(page, dateKey)
  await column.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await column.drop({ data: { "text/plain": processId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function dragCardToUnassigned(page: Page, processId: string) {
  const panel = getUnassignedPanel(page)
  await panel.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await panel.drop({ data: { "text/plain": processId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInDayColumn(
  page: Page,
  processId: string,
  dateKey: string,
) {
  await expect(
    getDayColumn(page, dateKey).locator(selectors.assegnazione.card(processId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardInUnassignedPanel(page: Page, processId: string) {
  await expect(
    getUnassignedPanel(page).locator(selectors.assegnazione.card(processId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInDayColumn(
  page: Page,
  processId: string,
  dateKey: string,
) {
  await expect(
    getDayColumn(page, dateKey).locator(selectors.assegnazione.card(processId)),
  ).toHaveCount(0)
}

export function processIdsByTipoRicerca(tipo: "nuova" | "sostituzione") {
  return ALL_ASSEGNAZIONE_PROCESS_IDS.filter((id) => {
    const processo = Object.values(E2E_ASSEGNAZIONE.processi).find((row) => row.id === id)
    return processo?.tipoRicerca === tipo
  })
}

export function processIdsWithRecruiter(recruiter: "recruiter" | "sales" | "none") {
  const { unassignedWithRecruiter, assignedToday, assignedTomorrow } = E2E_ASSEGNAZIONE.processi

  if (recruiter === "none") {
    return ALL_ASSEGNAZIONE_PROCESS_IDS.filter((id) => {
      const processo = Object.values(E2E_ASSEGNAZIONE.processi).find((row) => row.id === id)
      return processo && !processo.hasRecruiter
    })
  }

  if (recruiter === "recruiter") {
    return [unassignedWithRecruiter.id, assignedToday.id]
  }

  return [assignedTomorrow.id]
}
