import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  closeWorkerDetail,
  getWorkerCard,
  gotoCercaLavoratori,
  openWorkerDetail,
  workerDetailHeading,
  workerDetailTab,
} from "../support/lavoratori"
import { selectors } from "../support/selectors"

const { qualificatoMi } = E2E_LAVORATORI.lavoratori

test.describe("cerca lavoratori: worker detail", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await gotoCercaLavoratori(page)
  })

  test("opens detail with profile sections and closes back to list", async ({ page }) => {
    await openWorkerDetail(page, qualificatoMi.id)

    await expect(workerDetailHeading(page, qualificatoMi.displayName)).toBeVisible({
      timeout: 30_000,
    })
    await expect(workerDetailTab(page, "Profilo")).toBeVisible()
    await expect(workerDetailTab(page, "Residenza")).toBeVisible()
    await expect(workerDetailTab(page, "Calendario")).toBeVisible()
    await expect(workerDetailTab(page, "Ricerca")).toBeVisible()
    await expect(workerDetailTab(page, "Esperienze")).toBeVisible()
    await expect(workerDetailTab(page, "Competenze")).toBeVisible()
    await expect(workerDetailTab(page, "Documenti e dati amministrativi")).toBeVisible()
    await expect(workerDetailTab(page, "Ricerche")).toBeVisible()

    await closeWorkerDetail(page)
    await expect(page.locator(selectors.lavoratori.closeDetail)).toHaveCount(0)
    await expect(getWorkerCard(page, qualificatoMi.id)).toBeVisible()
  })

  test("section tabs scroll to related blocks", async ({ page }) => {
    await openWorkerDetail(page, qualificatoMi.id)
    await workerDetailTab(page, "Documenti e dati amministrativi").click()
    await expect(page.getByText("Documenti e dati amministrativi").first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test("deep link opens the requested worker detail", async ({ page }) => {
    await page.goto(`${selectors.routes.cercaLavoratori}/${qualificatoMi.id}`)
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })
    await expect(workerDetailHeading(page, qualificatoMi.displayName)).toBeVisible({
      timeout: 30_000,
    })
    await expect(getWorkerCard(page, qualificatoMi.id)).toHaveAttribute("data-selected", "true")
  })
})
