import { expect, test } from "@playwright/test"

import { gotoAnagrafiche, switchAnagraficheTab } from "../support/anagrafiche"
import { selectors } from "../support/selectors"

test.describe("anagrafiche: csv export", () => {
  test.describe.configure({ timeout: 60_000 })

  test("export produces a non-empty csv download", async ({ page }) => {
    await gotoAnagrafiche(page)
    await switchAnagraficheTab(page, "famiglie")

    const date = new Date().toISOString().slice(0, 10)
    const downloadPromise = page.waitForEvent("download")
    await page.locator(selectors.anagrafiche.exportCsv).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe(`anagrafiche-famiglie-${date}.csv`)
    const path = await download.path()
    expect(path).toBeTruthy()
    const content = await download.createReadStream()
    expect(content).toBeTruthy()
  })
})
