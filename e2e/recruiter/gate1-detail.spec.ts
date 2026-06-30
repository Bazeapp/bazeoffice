import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import { getWorkerCard, gotoGate1, workerDetailTab } from "../support/lavoratori"

test.describe("gate 1: worker detail", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await gotoGate1(page)
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
})
