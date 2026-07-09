import { expect, test } from "@playwright/test"

import { gotoAnagrafiche } from "../support/anagrafiche"
import { interceptTableQuery } from "../support/route-errors"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: load failure", () => {
  test.describe.configure({ timeout: 60_000 })

  test("data-load failure shows the error banner", async ({ page }) => {
    await interceptTableQuery(page, 500)
    await gotoAnagrafiche(page)

    await expect(page.locator(selectors.anagrafiche.loadError)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator(selectors.anagrafiche.loadError)).toContainText(
      "Errore caricamento dati",
    )
  })
})
