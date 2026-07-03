import { expect, test } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  expectLavoratoreCardVisibility,
  gate2IdoneiFixtureIds,
  getWorkerCard,
  gotoGate2,
  waitForLavoratoreUpdateRecord,
  workerDetailTab,
} from "../support/lavoratori"
import {
  readLavoratoreLookupField,
  resetGate2IdoneoFixture,
} from "../support/lavoratori-mutations"
import { selectors } from "../support/selectors"

const { idoneoMi } = E2E_LAVORATORI.lavoratori

test.describe("gate 2: worker detail", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await resetGate2IdoneoFixture()
    await gotoGate2(page)
  })

  test.afterEach(async () => {
    await resetGate2IdoneoFixture()
  })

  test("shows gate 2 stepper sections", async ({ page }) => {
    for (const workerId of gate2IdoneiFixtureIds()) {
      await expectLavoratoreCardVisibility(page, workerId, true)
    }
    await getWorkerCard(page, idoneoMi.id).click()
    await expect(workerDetailTab(page, "Referente")).toBeVisible({ timeout: 30_000 })
    await expect(workerDetailTab(page, "Tipologia lavori")).toBeVisible()
    await expect(workerDetailTab(page, "Competenze")).toBeVisible()
    await expect(workerDetailTab(page, "Assessment")).toBeVisible()
  })

  test("certificato decision persists after reopen", async ({ page }) => {
    await getWorkerCard(page, idoneoMi.id).click()
    await workerDetailTab(page, "Assessment").click()

    await page.getByText("Certificato", { exact: true }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Conferma" }).click()
    await waitForLavoratoreUpdateRecord(page)

    const persisted = await readLavoratoreLookupField(idoneoMi.id, "stato_lavoratore")
    expect(persisted).toMatch(/certificato/i)

    await page.goto(`${selectors.routes.cercaLavoratori}/${idoneoMi.id}`)
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })
    await expect(getWorkerCard(page, idoneoMi.id).getByText("Certificato")).toBeVisible({
      timeout: 30_000,
    })
  })
})
