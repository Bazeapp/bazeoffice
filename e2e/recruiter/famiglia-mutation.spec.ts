import { expect, test } from "@playwright/test"

import { E2E_FAMIGLIA } from "../constants"
import { updateFamigliaField } from "../support/famiglia-mutations"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: external famiglia write", () => {
  test("service-role mutation is visible after reload", async ({ page }) => {
    const mutatedCognome = `Rossi E2E ${Date.now()}`
    const famiglieSearch = page.getByPlaceholder("Cerca in famiglie...")

    await page.goto("/")
    await expect(page.locator(selectors.appSidebar)).toBeVisible({
      timeout: 30_000,
    })

    await famiglieSearch.fill(E2E_FAMIGLIA.searchText)
    await expect(page.getByText(E2E_FAMIGLIA.searchText)).toBeVisible({
      timeout: 30_000,
    })

    try {
      await updateFamigliaField(E2E_FAMIGLIA.id, "cognome", mutatedCognome)

      await page.reload()
      await expect(page.locator(selectors.appSidebar)).toBeVisible({
        timeout: 30_000,
      })
      await famiglieSearch.fill(mutatedCognome)
      await expect(page.getByText(mutatedCognome)).toBeVisible({
        timeout: 30_000,
      })
    } finally {
      await updateFamigliaField(E2E_FAMIGLIA.id, "cognome", E2E_FAMIGLIA.cognome)
    }
  })
})
