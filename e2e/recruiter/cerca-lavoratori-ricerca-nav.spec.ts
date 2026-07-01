import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI, E2E_RICERCA } from "../constants"
import {
  getWorkerCard,
  gotoCercaLavoratori,
  openWorkerDetail,
  workerDetailHeading,
  workerDetailTab,
} from "../support/lavoratori"
import { deleteWorkerSelezione } from "../support/ricerca-mutations"
import {
  clickBackFromRicercaDetail,
  e2eFamigliaDetailName,
  ricercaDetailHeading,
  waitForRicercaDetail,
} from "../support/ricerca"

const { qualificatoMi } = E2E_LAVORATORI.lavoratori
const { assignedToday } = E2E_RICERCA.processi

test.describe("cerca lavoratori: ricerca navigation", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await deleteWorkerSelezione(assignedToday.id, qualificatoMi.id)
  })

  test("opens ricerca detail from worker and returns with worker reselected", async ({
    page,
  }) => {
    await gotoCercaLavoratori(page)
    await openWorkerDetail(page, qualificatoMi.id)

    await page.getByRole("button", { name: "Aggiungi ad una ricerca" }).click()
    const dialog = page.getByRole("dialog", { name: "Aggiungi ad una ricerca" })
    await dialog
      .getByPlaceholder("Email famiglia, nome famiglia o ID ricerca")
      .fill(assignedToday.id)
    await dialog.getByRole("button", { name: /E2E Famiglia Rossi/i }).click()
    await dialog
      .getByPlaceholder("Scrivi perché vuoi aggiungere questo lavoratore alla ricerca")
      .fill("E2E ricerca navigation fixture")

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/create-record") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30_000 },
    )
    await dialog.getByRole("button", { name: "Aggiungi alla ricerca" }).click()
    await createResponse

    await workerDetailTab(page, "Ricerche").click()
    await page.getByRole("tab", { name: /Tutte le altre ricerche/i }).click()
    await page.getByText("E2E Famiglia Rossi", { exact: false }).first().click()

    await waitForRicercaDetail(page)
    await expect(page).toHaveURL(new RegExp(`/ricerca/${assignedToday.id}`))
    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(E2E_RICERCA.famiglie.rossi)),
    ).toBeVisible({ timeout: 30_000 })

    await clickBackFromRicercaDetail(page)
    await expect(page).toHaveURL(new RegExp(`/cerca-lavoratori/${qualificatoMi.id}`))
    await expect(workerDetailHeading(page, qualificatoMi.displayName)).toBeVisible({
      timeout: 30_000,
    })
    await expect(getWorkerCard(page, qualificatoMi.id)).toHaveAttribute("data-selected", "true")
  })
})
