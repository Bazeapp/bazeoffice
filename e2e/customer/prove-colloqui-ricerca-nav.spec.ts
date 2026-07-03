import { expect, test } from "@playwright/test"

import { E2E_PROVE_COLLOQUI, E2E_RICERCA } from "../constants"
import {
  e2eFamigliaDetailName,
  ricercaDetailHeading,
  waitForRicercaDetail,
} from "../support/ricerca"
import {
  gotoProveColloqui,
  openColloquioEvent,
  switchToColloquiTab,
} from "../support/prove-colloqui"

const { rossi } = E2E_PROVE_COLLOQUI.colloqui

test.describe("prove-colloqui: ricerca navigation", () => {
  test.describe.configure({ timeout: 60_000 })

  test("colloquio sheet opens ricerca detail via scheda completa", async ({ page }) => {
    await gotoProveColloqui(page)
    await switchToColloquiTab(page)
    await page.getByRole("button", { name: "Oggi" }).click()

    const dialog = await openColloquioEvent(page, rossi.eventDomId)
    await dialog.getByRole("button", { name: "Apri scheda completa" }).click()

    await waitForRicercaDetail(page)
    await expect(page).toHaveURL(new RegExp(`/ricerca/${rossi.processoId}`))
    await expect(
      ricercaDetailHeading(page, e2eFamigliaDetailName(E2E_RICERCA.famiglie.rossi)),
    ).toBeVisible({ timeout: 30_000 })
  })
})
