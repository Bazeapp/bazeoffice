import { expect, test, type Page } from "@playwright/test"

import { E2E_PROVE_COLLOQUI } from "../constants"
import {
  clearSearchQuery,
  closeSheet,
  getCalendarEvent,
  gotoProveColloqui,
  openColloquioEvent,
  setSearchQuery,
  switchToColloquiTab,
} from "../support/prove-colloqui"

test.describe("prove-colloqui: colloqui calendar", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("calendar", () => {
    test.describe.configure({ mode: "serial" })

    let provePage: Page
    const { rossi, bianchi } = E2E_PROVE_COLLOQUI.colloqui

    test.beforeAll(async ({ browser }) => {
      provePage = await browser.newPage()
      await gotoProveColloqui(provePage)
      await switchToColloquiTab(provePage)
    })

    test.afterAll(async () => {
      await provePage.close()
    })

    test.beforeEach(async () => {
      await clearSearchQuery(provePage)
      await switchToColloquiTab(provePage)
      await provePage.getByRole("button", { name: "Oggi" }).click()
    })

    test("shows fixture colloquio events for both families", async () => {
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toBeVisible({
        timeout: 30_000,
      })
      await expect(getCalendarEvent(provePage, bianchi.eventDomId)).toBeVisible({
        timeout: 30_000,
      })
    })

    test("calendar kind filters hide colloquio events when unchecked", async () => {
      const colloquioChip = provePage
        .locator("span", { hasText: /^Tipo$/ })
        .locator("..")
        .getByRole("checkbox", { name: "Colloquio" })
      await colloquioChip.click()
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toHaveCount(0)
      await colloquioChip.click()
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toBeVisible()
    })

    test("search narrows calendar events by worker surname", async () => {
      await setSearchQuery(provePage, rossi.lavoratoreSearchText)
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toBeVisible()
      await expect(getCalendarEvent(provePage, bianchi.eventDomId)).toHaveCount(0)
    })

    test("colloquio sheet opens with process context and esito select", async () => {
      const dialog = await openColloquioEvent(provePage, rossi.eventDomId)

      await expect(
        dialog.getByRole("heading", {
          name: new RegExp(`${rossi.lavoratoreSearchText}.*${rossi.famigliaSearchText}`),
        }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(dialog.getByText("Colloquio", { exact: true }).first()).toBeVisible()
      await expect(dialog.getByText("Esito colloquio", { exact: true })).toBeVisible()
      await expect(dialog.getByRole("button", { name: "Apri scheda completa" })).toBeVisible()
      await expect(dialog.getByText("prova_colloquio_res", { exact: true })).toBeVisible()

      await closeSheet(provePage)
    })

    test("colloquio esito change persists after reopen", async () => {
      const dialog = await openColloquioEvent(provePage, rossi.eventDomId)
      const esitoSelect = dialog.getByRole("combobox").first()
      await esitoSelect.click()
      const option = provePage.getByRole("option").nth(1)
      const optionLabel = (await option.textContent()) ?? ""
      await option.click()

      const updateResponse = provePage.waitForResponse(
        (response) =>
          response.url().includes("/functions/v1/update-record") &&
          response.request().method() === "POST" &&
          response.ok(),
        { timeout: 30_000 },
      )
      await updateResponse

      await closeSheet(provePage)
      const reopened = await openColloquioEvent(provePage, rossi.eventDomId)
      await expect(reopened.getByRole("combobox").first()).toContainText(optionLabel.trim())
      await closeSheet(provePage)
    })

    test("week navigation keeps fixture events discoverable", async () => {
      await provePage.getByRole("button", { name: "Periodo precedente" }).click()
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toHaveCount(0)

      await provePage.getByRole("button", { name: "Oggi" }).click()
      await expect(getCalendarEvent(provePage, rossi.eventDomId)).toBeVisible()
    })
  })
})
