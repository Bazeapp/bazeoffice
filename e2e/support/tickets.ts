import { expect, type Locator, type Page } from "@playwright/test"

import {
  E2E_TICKET_CUSTOMER,
  E2E_TICKET_CUSTOMER_VISIBLE_FIXTURE_IDS,
  E2E_TICKET_PAYROLL,
  E2E_TICKET_PAYROLL_VISIBLE_FIXTURE_IDS,
  ticketsStageTestId,
} from "../constants"
import { selectors } from "./selectors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const SEARCH_DEBOUNCE_MS = 400

export type SupportTicketBoardKind = "customer" | "payroll"

type BoardSelectors = (typeof selectors)["ticketCustomer"]

function getBoardSelectors(kind: SupportTicketBoardKind): BoardSelectors {
  return kind === "customer" ? selectors.ticketCustomer : selectors.ticketPayroll
}

function getBoardRoute(kind: SupportTicketBoardKind) {
  return kind === "customer" ? selectors.routes.ticketCustomer : selectors.routes.ticketPayroll
}

function getVisibleFixtureIds(kind: SupportTicketBoardKind) {
  return kind === "customer"
    ? E2E_TICKET_CUSTOMER_VISIBLE_FIXTURE_IDS
    : E2E_TICKET_PAYROLL_VISIBLE_FIXTURE_IDS
}

function getDefaultStage(kind: SupportTicketBoardKind) {
  return kind === "customer"
    ? E2E_TICKET_CUSTOMER.stages.aperto
    : E2E_TICKET_PAYROLL.stages.aperto
}

export function getColumn(page: Page, kind: SupportTicketBoardKind, stageLabel: string): Locator {
  const board = getBoardSelectors(kind)
  return page.locator(board.column(ticketsStageTestId(stageLabel)))
}

export function getCard(page: Page, kind: SupportTicketBoardKind, ticketId: string): Locator {
  const board = getBoardSelectors(kind)
  return page.locator(board.card(ticketId))
}

export async function countVisibleTicketFixtureCards(page: Page, kind: SupportTicketBoardKind) {
  const visibility = await Promise.all(
    getVisibleFixtureIds(kind).map((ticketId) => getCard(page, kind, ticketId).isVisible()),
  )
  return visibility.filter(Boolean).length
}

export async function expectTicketCardVisibility(
  page: Page,
  kind: SupportTicketBoardKind,
  ticketId: string,
  visible: boolean,
) {
  const card = getCard(page, kind, ticketId)
  if (visible) {
    await expect(card).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  } else {
    await expect(card).toHaveCount(0)
  }
}

export async function expectVisibleTicketFixtureCount(
  page: Page,
  kind: SupportTicketBoardKind,
  expected: number,
) {
  await expect
    .poll(async () => countVisibleTicketFixtureCards(page, kind), {
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    .toBe(expected)
}

export async function gotoSupportTickets(page: Page, kind: SupportTicketBoardKind) {
  const board = getBoardSelectors(kind)
  await page.goto(getBoardRoute(kind))
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("heading", { name: board.heading })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(board.searchInput)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, kind, getDefaultStage(kind))).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function reloadSupportTickets(page: Page, kind: SupportTicketBoardKind) {
  const board = getBoardSelectors(kind)
  await page.goto(getBoardRoute(kind))
  await expect(page.getByRole("heading", { name: board.heading })).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(getColumn(page, kind, getDefaultStage(kind))).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export async function setSearchQuery(page: Page, kind: SupportTicketBoardKind, query: string) {
  const board = getBoardSelectors(kind)
  await page.locator(board.searchInput).fill(query)
  if (query.trim()) {
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
  }
}

export async function clearSearchQuery(page: Page, kind: SupportTicketBoardKind) {
  const board = getBoardSelectors(kind)
  const clearButton = page.getByRole("button", { name: "Cancella ricerca" })
  if (await clearButton.isVisible()) {
    await clearButton.click()
  } else {
    await page.locator(board.searchInput).fill("")
  }
  await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
}

export async function setStageFilter(
  page: Page,
  kind: SupportTicketBoardKind,
  stageLabel: string,
) {
  const board = getBoardSelectors(kind)
  await page.locator(board.stageFilter).click()
  await page.getByRole("option", { name: stageLabel, exact: true }).click()
}

export async function clearStageFilter(page: Page, kind: SupportTicketBoardKind) {
  const board = getBoardSelectors(kind)
  await page.locator(board.stageFilter).click()
  await page.getByRole("option", { name: "Tutti gli stati", exact: true }).click()
}

export async function resetFilters(page: Page, kind: SupportTicketBoardKind) {
  const resetButton = page.getByRole("button", { name: "Reset filtri" })
  if (await resetButton.isVisible()) {
    await resetButton.click()
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS)
    return
  }
  await clearSearchQuery(page, kind)
  await clearStageFilter(page, kind)
}

export async function openCardSheet(page: Page, kind: SupportTicketBoardKind, ticketId: string) {
  const card = getCard(page, kind, ticketId)
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const dialog = page.locator(getBoardSelectors(kind).sheetDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function closeCardSheet(page: Page, kind: SupportTicketBoardKind) {
  await page.keyboard.press("Escape")
  await expect(page.locator(getBoardSelectors(kind).sheetDialog)).toHaveCount(0)
}

export async function openCreateDialog(page: Page, kind: SupportTicketBoardKind) {
  await page.locator(getBoardSelectors(kind).openCreate).click()
  const dialog = page.locator(getBoardSelectors(kind).createDialog)
  await expect(dialog).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
  return dialog
}

export async function showClosedTickets(page: Page, kind: SupportTicketBoardKind) {
  const closedColumn = getColumn(page, kind, E2E_TICKET_CUSTOMER.stages.chiuso)
  await closedColumn.scrollIntoViewIfNeeded()
  await closedColumn.getByRole("button", { name: "Mostra chiusi" }).click()
}

export async function dragCardToColumn(
  page: Page,
  kind: SupportTicketBoardKind,
  ticketId: string,
  targetStageLabel: string,
) {
  const column = getColumn(page, kind, targetStageLabel)
  await column.scrollIntoViewIfNeeded()

  const updateResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/update-record") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .catch(() => null)

  await column.drop({ data: { "text/plain": ticketId } })
  if (updateResponse) {
    await updateResponse
  }
}

export async function expectCardInColumn(
  page: Page,
  kind: SupportTicketBoardKind,
  ticketId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, kind, stageLabel).locator(getBoardSelectors(kind).card(ticketId)),
  ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
}

export async function expectCardNotInColumn(
  page: Page,
  kind: SupportTicketBoardKind,
  ticketId: string,
  stageLabel: string,
) {
  await expect(
    getColumn(page, kind, stageLabel).locator(getBoardSelectors(kind).card(ticketId)),
  ).toHaveCount(0)
}

export async function setStatoTicketInSheet(
  page: Page,
  kind: SupportTicketBoardKind,
  targetStageLabel: string,
) {
  const dialog = page.locator(getBoardSelectors(kind).sheetDialog)
  await dialog.getByRole("combobox").first().click()
  await page.getByRole("option", { name: targetStageLabel, exact: true }).click()
}

export function getTicketSheetSection(sheet: Locator, sectionTitle: string) {
  return sheet
    .getByText(sectionTitle, { exact: true })
    .locator('xpath=ancestor::*[@data-slot="card"][1]')
}

export function getTicketRapportoSection(sheet: Locator) {
  return sheet
    .getByText(/^(Rapporto collegato|Collega rapporto)$/, { exact: true })
    .locator('xpath=ancestor::*[@data-slot="card"][1]')
}

export async function waitForTicketPatch(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes("/functions/v1/update-record") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: BOARD_LOAD_TIMEOUT_MS },
  )
}
