import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI, E2E_RICERCA } from "../constants"
import {
  dragWorkerSelectionToGroup,
  gotoRicercaDetail,
  ricercaAddWorkerDialog,
  ricercaPipelineAddButton,
} from "../support/ricerca"
import { deleteAllSelezioneForProcess, readWorkerSelezioneId } from "../support/ricerca-mutations"
import { readWorkerSelezioneStato } from "../support/lavoratori-mutations"
import { resetAssegnazioneFixture } from "../support/processo-mutations"

const { unassignedNuova } = E2E_RICERCA.processi
const { idoneoMi } = E2E_LAVORATORI.lavoratori

test.describe("ricerca: worker pipeline moves", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.afterEach(async () => {
    await deleteAllSelezioneForProcess(unassignedNuova.id)
    await resetAssegnazioneFixture()
  })

  test("moves a worker from Prospetto to Poor fit and persists after reload", async ({
    page,
  }) => {
    await gotoRicercaDetail(page, unassignedNuova.id)

    await ricercaPipelineAddButton(page).click()
    const dialog = ricercaAddWorkerDialog(page)
    await dialog.getByPlaceholder("Nome, cognome o email").fill(idoneoMi.searchText)
    await dialog.getByRole("button", { name: idoneoMi.displayName }).click()
    await dialog
      .getByPlaceholder("Scrivi perché l'hai selezionato per questa ricerca")
      .fill("E2E pipeline move fixture")
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
    await expect
      .poll(
        async () =>
          page.getByText(idoneoMi.displayName, { exact: true }).first().isVisible(),
        { timeout: 30_000 },
      )
      .toBe(true)

    let selectionId: string | null = null
    await expect
      .poll(async () => {
        selectionId = await readWorkerSelezioneId(unassignedNuova.id, idoneoMi.id)
        return selectionId
      }, { timeout: 15_000 })
      .toBeTruthy()

    await dragWorkerSelectionToGroup(page, idoneoMi.displayName, "Poor fit", selectionId!)
    await expect(page.getByText("Poor fit", { exact: true }).first()).toBeVisible()

    const persisted = await readWorkerSelezioneStato(unassignedNuova.id, idoneoMi.id)
    expect(persisted).toMatch(/poor fit/i)

    await page.reload()
    await gotoRicercaDetail(page, unassignedNuova.id)
    await expect(page.getByText(idoneoMi.displayName, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Poor fit", { exact: true }).first()).toBeVisible()
  })
})
