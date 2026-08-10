import { expect, test, type Page } from "@playwright/test"

import { E2E_CEDOLINI, E2E_CEDOLINI_BULK } from "../constants"
import { gotoCedoliniPagamenti } from "../support/cedolini"
import {
  readReminderFlag,
  resetCedoliniBulkFixture,
} from "../support/cedolini-bulk-mutations"
import { mockEdgeFunctionSuccess } from "../support/route-errors"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const REMINDER_TIMEOUT_MS = 60_000

test.describe("cedolini: pagamenti reminders", () => {
  test.describe.configure({ mode: "serial", timeout: REMINDER_TIMEOUT_MS })

  let pagamentiPage: Page
  const { reminderDaFare, reminderFatto } = E2E_CEDOLINI_BULK.pagamenti

  test.beforeAll(async ({ browser }) => {
    pagamentiPage = await browser.newPage()
    await mockEdgeFunctionSuccess(pagamentiPage, "wk-reminder-pagamento", {
      success: true,
    })
    await gotoCedoliniPagamenti(pagamentiPage)
  })

  test.afterAll(async () => {
    await resetCedoliniBulkFixture()
    await pagamentiPage.close()
  })

  test.beforeEach(async () => {
    await resetCedoliniBulkFixture()
    await pagamentiPage.reload()
    await gotoCedoliniPagamenti(pagamentiPage)
  })

  test("lists reminder da fare / fatti and hides inviato without transazione", async () => {
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${reminderDaFare.id}`),
    ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${reminderFatto.id}`),
    ).toBeVisible()
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${E2E_CEDOLINI.cedolini.inviatoCedolino.id}`),
    ).toHaveCount(0)
  })

  test("AE6: date filter hides cards and disables bulk reminder", async () => {
    // Filter is inclusive upper bound (`data_invio_famiglia <= filter`).
    // f619 is 2026-06-10 — a date *before* that excludes it from da-fare.
    await pagamentiPage.getByTestId("cedolini-pagamenti-date-filter").fill("2026-06-05")
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${reminderDaFare.id}`),
    ).toHaveCount(0)
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-invia")).toBeDisabled()

    await pagamentiPage.getByTestId("cedolini-pagamenti-date-filter-clear").click()
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${reminderDaFare.id}`),
    ).toBeVisible()
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-invia")).toBeEnabled()
  })

  test("BAZ-180: deselect all excludes families from bulk; select all restores", async () => {
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-include-${reminderDaFare.id}`),
    ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-selection-summary")).toContainText(
      "Inclusi",
    )

    await pagamentiPage.getByTestId("cedolini-pagamenti-deselect-all").click()
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-invia")).toBeDisabled()
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-selection-summary")).toContainText(
      "Inclusi 0",
    )

    await pagamentiPage.getByTestId("cedolini-pagamenti-select-all").click()
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-invia")).toBeEnabled()
  })

  test("AE6: inclusive date filter keeps bulk count aligned with visible da-fare cards", async () => {
    await pagamentiPage.getByTestId("cedolini-pagamenti-date-filter").fill(reminderDaFare.dataInvioFamiglia)
    await expect(
      pagamentiPage.getByTestId(`cedolini-pagamenti-card-${reminderDaFare.id}`),
    ).toBeVisible()

    const startResponse = pagamentiPage.waitForResponse(
      (response) => {
        if (
          !response.url().includes("/functions/v1/cedolini-bulk-job") ||
          response.request().method() !== "POST"
        ) {
          return false
        }
        const body = response.request().postDataJSON() as { action?: string }
        return body.action === "start"
      },
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )

    await pagamentiPage.getByTestId("cedolini-pagamenti-reminder-invia").click()
    await pagamentiPage.getByRole("button", { name: "Avvia promemoria di prova" }).click()

    const start = await startResponse
    const startBody = start.request().postDataJSON() as { mese_lavorativo_ids?: string[] }
    expect(startBody.mese_lavorativo_ids).toEqual([reminderDaFare.id])

    // Single filtered card → dry run is the whole batch → summary, no confirm.
    await expect
      .poll(async () => pagamentiPage.getByTestId("cedolini-pagamenti-reminder-summary").isVisible(), {
        timeout: REMINDER_TIMEOUT_MS,
      })
      .toBe(true)
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-confirm")).toHaveCount(0)
    await expect(pagamentiPage.getByTestId("cedolini-pagamenti-reminder-summary")).toContainText(
      "1 inviati",
    )

    // Server-side worker flips the reminder flag (browser mocks do not cover that hop).
    await expect
      .poll(async () => readReminderFlag(reminderDaFare.id), {
        timeout: REMINDER_TIMEOUT_MS,
      })
      .toBe(true)
  })
})
