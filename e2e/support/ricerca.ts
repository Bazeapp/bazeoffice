import { expect, type Locator, type Page } from "@playwright/test"

import { E2E_RICERCA } from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000

const ALL_RICERCA_PROCESS_IDS = Object.values(E2E_RICERCA.processi).map(
  (processo) => processo.id,
)

export const E2E_RICERCA_FIXTURE_COUNT = ALL_RICERCA_PROCESS_IDS.length

export function getColumn(page: Page, stageId: string): Locator {
  return page.locator(selectors.ricerca.column(stageId))
}

export function getCard(page: Page, processId: string): Locator {
  return page.locator(selectors.ricerca.card(processId))
}

export async function countVisibleRicercaFixtureCards(page: Page) {
  const visibility = await Promise.all(
    ALL_RICERCA_PROCESS_IDS.map((processId) => getCard(page, processId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectRicercaCardVisibility(
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

export async function expectVisibleRicercaFixtureCount(page: Page, expected: number) {
  await expect
    .poll(async () => countVisibleRicercaFixtureCards(page), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoRicerca(page: Page) {
  await page.goto(selectors.routes.ricerca)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(
    page.getByRole("heading", { name: selectors.ricerca.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(page.locator(selectors.ricerca.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, E2E_RICERCA.stages.daAssegnare)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadRicerca(page: Page) {
  await page.goto(selectors.routes.ricerca)
  await expect(
    page.getByRole("heading", { name: selectors.ricerca.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  await expect(getColumn(page, E2E_RICERCA.stages.daAssegnare)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

async function selectDropdownOption(page: Page, label: string) {
  await page.getByRole("option", { name: new RegExp(label, "i") }).first().click()
}

export async function setRecruiterFilter(
  page: Page,
  option: "all" | "unassigned" | "recruiter" | "sales",
) {
  const label =
    option === "all"
      ? "Tutti i recruiter"
      : option === "unassigned"
        ? "Senza recruiter"
        : option === "recruiter"
          ? E2E_RICERCA.operatori.recruiter.displayName
          : E2E_RICERCA.operatori.sales.displayName

  await page.locator(selectors.ricerca.filterRecruiter).click()
  await selectDropdownOption(page, label)
}

export async function setSearchQuery(page: Page, query: string) {
  await page.locator(selectors.ricerca.searchInput).fill(query)
}

export async function clearSearchQuery(page: Page) {
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(selectors.ricerca.searchInput).fill("")
  }
}

export async function openCardDetail(page: Page, processId: string) {
  const card = getCard(page, processId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/ricerca/${processId}`), {
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function backToRicercaBoard(page: Page) {
  await page.locator(selectors.ricerca.backToBoard).click()
  await expect(
    page.getByRole("heading", { name: selectors.ricerca.heading }),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function dragCardToColumn(
  page: Page,
  processId: string,
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

  await column.drop({ data: { "text/plain": processId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  processId: string,
  stageId: string,
) {
  await expect(
    getColumn(page, stageId).locator(selectors.ricerca.card(processId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  processId: string,
  stageId: string,
) {
  await expect(
    getColumn(page, stageId).locator(selectors.ricerca.card(processId)),
  ).toHaveCount(0)
}

export function processIdsInStage(stageId: keyof typeof E2E_RICERCA.stages) {
  const { daAssegnare, fareRicerca } = E2E_RICERCA.stages
  const {
    unassignedNuova,
    unassignedWithRecruiter,
    unassignedSostituzione,
    assignedToday,
    assignedTomorrow,
  } = E2E_RICERCA.processi

  if (stageId === "daAssegnare") {
    return [unassignedNuova.id, unassignedWithRecruiter.id, unassignedSostituzione.id]
  }
  if (stageId === "fareRicerca") {
    return [assignedToday.id, assignedTomorrow.id]
  }
  return []
}

export function processIdsWithRecruiter(recruiter: "recruiter" | "sales" | "unassigned") {
  const {
    unassignedNuova,
    unassignedWithRecruiter,
    unassignedSostituzione,
    assignedToday,
    assignedTomorrow,
  } = E2E_RICERCA.processi

  if (recruiter === "unassigned") {
    return [unassignedNuova.id, unassignedSostituzione.id]
  }
  if (recruiter === "recruiter") {
    return [unassignedWithRecruiter.id, assignedToday.id]
  }
  return [assignedTomorrow.id]
}
