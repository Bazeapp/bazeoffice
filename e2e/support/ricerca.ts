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
  await waitForRicercaDetail(page)
}

export async function gotoRicercaDetail(page: Page, processId: string) {
  await page.goto(`${selectors.routes.ricerca}/${encodeURIComponent(processId)}`)
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await waitForRicercaDetail(page)
}

export async function waitForRicercaDetail(page: Page) {
  await expect(page.getByText("Caricamento dettaglio ricerca...")).toHaveCount(0, {
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.ricerca.backToBoard)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
}

export function ricercaDetailHeading(page: Page, familyDisplayName: string) {
  return page.getByRole("heading", { name: familyDisplayName, exact: true })
}

export function ricercaDetailTab(page: Page, label: "Pipeline" | "Mappa") {
  return page.getByRole("tab", { name: label })
}

/** Matches seed_e2e_assegnazione.sql `v_deadline := v_today + 5`. */
export function getFixtureDeadlineLabel(daysFromToday = 5) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysFromToday)
  const isoDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate))
}

export function e2eFamigliaDetailName(displayName: string) {
  return `E2E ${displayName}`
}

export function ricercaPipelineSmartMatchingButton(page: Page) {
  return page.getByRole("button", { name: "Smart Matching" })
}

export function ricercaPipelineAddButton(page: Page) {
  return page.getByRole("button", { name: "Aggiungi", exact: true })
}

export function ricercaAddWorkerDialog(page: Page) {
  return page.getByRole("dialog", { name: "Aggiungi lavoratore" })
}

export function ricercaDetailAside(page: Page) {
  return page.locator("aside").filter({
    has: page.getByText("Orari e frequenza", { exact: true }),
  })
}

export function ricercaAccordionSection(page: Page, label: string) {
  return page.locator(".group\\/accordion-item").filter({
    has: page.getByText(label, { exact: true }),
  })
}

export async function expandRicercaAccordionSection(page: Page, label: string) {
  const section = ricercaAccordionSection(page, label)
  if ((await section.getAttribute("data-state")) !== "open") {
    await section.getByRole("button", { name: "Apri o chiudi sezione" }).click()
  }
  return section
}

export async function openRicercaHeaderSectionEdit(page: Page) {
  await ricercaDetailAside(page)
    .getByRole("button", { name: "Modifica sezione" })
    .first()
    .click()
}

export function ricercaFieldInput(page: Page, label: string) {
  return ricercaDetailAside(page)
    .getByRole("group")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("input, textarea")
    .first()
}

export async function openRicercaAccordionSectionEdit(page: Page, label: string) {
  const section = ricercaAccordionSection(page, label)
  await section.getByRole("button", { name: "Modifica sezione" }).click()
  return section
}

export async function waitForRicercaUpdateRecord(page: Page) {
  await page.waitForResponse(
    (response) =>
      (response.url().includes("/functions/v1/update-record") ||
        response.url().includes("/functions/v1/create-record")) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 15_000 },
  )
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
