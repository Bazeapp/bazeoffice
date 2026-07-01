import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  getWorkerCard,
  gotoCercaLavoratori,
  gotoGate1,
  setSearchQuery,
  waitForLavoratoreUpdateRecord,
  workerDetailTab,
} from "../support/lavoratori"
import { resetGate1Fixture } from "../support/lavoratori-mutations"

test.describe("gate 1: worker detail", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await resetGate1Fixture()
    await gotoGate1(page)
  })

  test.afterEach(async () => {
    await resetGate1Fixture()
  })

  test("auto-selects first worker and shows gate stepper sections", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Referente e presentazione", exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(workerDetailTab(page, "Check Baze")).toBeVisible()
    await expect(workerDetailTab(page, "Indirizzo")).toBeVisible()
    await expect(workerDetailTab(page, "Autocertificazioni")).toBeVisible()
    await expect(workerDetailTab(page, "Tipologia lavori")).toBeVisible()
    await expect(workerDetailTab(page, "Check disponibilita")).toBeVisible()
  })

  test("selecting another worker updates the active card", async ({ page }) => {
    const { qualificatoTo } = E2E_LAVORATORI.lavoratori
    await getWorkerCard(page, qualificatoTo.id).click()
    await expect(getWorkerCard(page, qualificatoTo.id)).toHaveAttribute("data-selected", "true")
  })

  test("non idoneo decision requires motivazione and persists", async ({ page }) => {
    const { qualificatoTo } = E2E_LAVORATORI.lavoratori
    await getWorkerCard(page, qualificatoTo.id).click()
    await workerDetailTab(page, "Assessment").click()

    await page.getByText("Non idoneo", { exact: true }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog.getByRole("combobox").click()
    await page.getByRole("option").first().click()
    await dialog.getByRole("button", { name: "Conferma" }).click()
    await waitForLavoratoreUpdateRecord(page)

    await page.reload()
    await gotoCercaLavoratori(page)
    await setSearchQuery(page, qualificatoTo.searchText)
    const card = getWorkerCard(page, qualificatoTo.id)
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card.getByText("Non idoneo", { exact: true })).toBeVisible()
  })
})
