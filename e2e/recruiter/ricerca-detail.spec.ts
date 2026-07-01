import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI, E2E_PIPELINE, E2E_RICERCA } from "../constants"
import {
  backToRicercaBoard,
  e2eFamigliaDetailName,
  getFixtureDeadlineLabel,
  gotoRicerca,
  gotoRicercaDetail,
  openCardDetail,
  reloadRicerca,
  ricercaAddWorkerDialog,
  ricercaDetailHeading,
  ricercaDetailTab,
  ricercaPipelineAddButton,
  ricercaPipelineSmartMatchingButton,
} from "../support/ricerca"
import { deleteAllSelezioneForProcess } from "../support/ricerca-mutations"
import { interceptEdgeFunction, mockEdgeFunctionSuccess } from "../support/route-errors"
import { resetAssegnazioneFixture } from "../support/processo-mutations"

const { unassignedNuova, assignedToday, assignedTomorrow } = E2E_RICERCA.processi
const { rossi, bianchi } = E2E_PIPELINE.famiglie
const { fareRicerca: fareRicercaLabel } = E2E_RICERCA.stageLabels

test.describe("ricerca: detail view", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssegnazioneFixture()
    await reloadRicerca(page)
  })

  test("opens detail with family title and pipeline tab, then returns to board", async ({
    page,
  }) => {
    await gotoRicerca(page)
    await openCardDetail(page, unassignedNuova.id)

    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(rossi.displayName)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(ricercaDetailTab(page, "Pipeline")).toBeVisible()
    await expect(ricercaDetailTab(page, "Mappa")).toBeVisible()
    await expect(page.getByText("Good fit", { exact: true })).toBeVisible()

    await backToRicercaBoard(page)
    await expect(page).toHaveURL(/\/ricerca$/)
  })

  test("scheduled card detail shows stato and recruiter context", async ({ page }) => {
    await gotoRicerca(page)
    await openCardDetail(page, assignedToday.id)

    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(rossi.displayName)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("combobox", { name: "Cambia recruiter assegnato" }),
    ).toBeVisible()
    await expect(page.getByText(fareRicercaLabel, { exact: true }).first()).toBeVisible()
  })

  test("deep link opens the requested ricerca detail", async ({ page }) => {
    await gotoRicercaDetail(page, assignedTomorrow.id)

    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(bianchi.displayName)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(new RegExp(`/ricerca/${assignedTomorrow.id}`))
  })

  test("bianchi fixture shows family summary metadata in the sidebar", async ({ page }) => {
    await gotoRicercaDetail(page, assignedTomorrow.id)

    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(bianchi.displayName)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(fareRicercaLabel, { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Prova diretta", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Babysitter / Tata-Colf", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Part time", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(bianchi.email, { exact: true })).toBeVisible()
    await expect(page.getByText("25h / sett · 4gg", { exact: true })).toBeVisible()
    await expect(
      page.getByText(`Deadline: ${getFixtureDeadlineLabel()}`, { exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Orari e frequenza", { exact: true })).toBeVisible()
  })

  test("pipeline and mappa tabs switch the active detail panel", async ({ page }) => {
    await gotoRicercaDetail(page, assignedTomorrow.id)

    await expect(ricercaDetailTab(page, "Pipeline")).toHaveAttribute("data-state", "active")
    await expect(page.getByText("Good fit", { exact: true })).toBeVisible({ timeout: 30_000 })

    await ricercaDetailTab(page, "Mappa").click()
    await expect(ricercaDetailTab(page, "Mappa")).toHaveAttribute("data-state", "active")
    await expect(page.getByText("Mappa lavoratori", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 30_000 })

    await ricercaDetailTab(page, "Pipeline").click()
    await expect(ricercaDetailTab(page, "Pipeline")).toHaveAttribute("data-state", "active")
    await expect(ricercaPipelineAddButton(page)).toBeVisible()
    await expect(ricercaPipelineSmartMatchingButton(page)).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoRicerca(page)
    await openCardDetail(page, assignedToday.id)
    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(rossi.displayName)),
    ).toBeVisible({ timeout: 30_000 })

    await backToRicercaBoard(page)
    await openCardDetail(page, assignedTomorrow.id)
    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(bianchi.displayName)),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(rossi.displayName)),
    ).toHaveCount(0)
  })
})

test.describe("ricerca: detail pipeline actions", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  const { unassignedNuova } = E2E_RICERCA.processi
  const { idoneoMi } = E2E_LAVORATORI.lavoratori

  test.afterEach(async () => {
    await deleteAllSelezioneForProcess(unassignedNuova.id)
    await resetAssegnazioneFixture()
  })

  test("smart matching button shows loading state and success toast", async ({ page }) => {
    // E2E fixture UUIDs are nil-version and are not resolved by smartmatching-v21's
    // isUuid() check (it queries airtable_record_id instead). Mock the EF to exercise
    // the recruiter-facing action wiring: request, loading state, toast, refresh.
    await mockEdgeFunctionSuccess(page, "smartmatching-v21", {
      selected_count: 2,
      selected_workers: [],
    })

    await gotoRicercaDetail(page, unassignedNuova.id)

    const smartMatchingResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/smartmatching-v21") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    )

    await ricercaPipelineSmartMatchingButton(page).click()
    await expect(page.getByRole("button", { name: "Calcolo in corso..." })).toBeVisible()
    await smartMatchingResponse

    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: /Smart Matching completato: 2 lavoratori trovati/i }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(ricercaPipelineSmartMatchingButton(page)).toBeEnabled()
  })

  test("smart matching surfaces an error toast when the edge function fails", async ({
    page,
  }) => {
    await interceptEdgeFunction(page, "smartmatching-v21", 500)

    await gotoRicercaDetail(page, unassignedNuova.id)
    await ricercaPipelineSmartMatchingButton(page).click()

    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: /Errore avvio Smart Matching|E2E injected 500/i }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("aggiungi lavoratore dialog adds a worker to the Prospetto column", async ({ page }) => {
    await gotoRicercaDetail(page, unassignedNuova.id)

    await ricercaPipelineAddButton(page).click()
    const dialog = ricercaAddWorkerDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Cerca un lavoratore per nome o email")).toBeVisible()

    await dialog.getByPlaceholder("Nome, cognome o email").fill(idoneoMi.searchText)
    await expect(dialog.getByRole("button", { name: idoneoMi.displayName })).toBeVisible({
      timeout: 30_000,
    })
    await dialog.getByRole("button", { name: idoneoMi.displayName }).click()
    await dialog
      .getByPlaceholder("Scrivi perché l'hai selezionato per questa ricerca")
      .fill("E2E fixture — inserimento manuale")

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/create-record") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    )

    await dialog.getByRole("button", { name: "Aggiungi lavoratore" }).click()
    await createResponse

    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: /Lavoratore aggiunto in Prospetto/i,
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(dialog).toHaveCount(0)

    await expect(page.getByText("Prospetto", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(idoneoMi.displayName, { exact: true }).first()).toBeVisible()
  })
})
