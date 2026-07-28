import { expect, test } from "@playwright/test"

import { E2E_CEDOLINI_BULK } from "../constants"
import { gotoCedoliniControlli, switchToControlliTab } from "../support/cedolini"
import {
  readCedolinoStato,
  resetCedoliniBulkFixture,
  setCedolinoAttachment,
  setCedolinoStato,
  updateCheckResultStatus,
} from "../support/cedolini-bulk-mutations"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const BULK_SEND_TIMEOUT_MS = 90_000

test.describe("cedolini: controlli bulk send", () => {
  test.describe.configure({ mode: "serial", timeout: BULK_SEND_TIMEOUT_MS })

  const { prontoCandidate, oreMismatch } = E2E_CEDOLINI_BULK.controlli
  const { oreMismatch: oreResultId } = E2E_CEDOLINI_BULK.checkResults

  test.beforeEach(async ({ page }) => {
    await resetCedoliniBulkFixture()
    await gotoCedoliniControlli(page)
  })

  test.afterEach(async () => {
    await resetCedoliniBulkFixture()
  })

  async function startSendDryRun(page: import("@playwright/test").Page) {
    await expect(page.getByTestId("cedolini-controlli-invia")).toBeEnabled({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    await page.getByTestId("cedolini-controlli-invia").click()
    await page.getByRole("button", { name: "Avvia invio di prova" }).click()
    await expect(page.getByTestId("cedolini-controlli-send-dialog")).toBeVisible({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
  }

  async function seedSecondPronto() {
    // Second Pronti card so dry-run leaves a remainder → confirm step (AE3).
    await updateCheckResultStatus(oreResultId, "ok", [])
  }

  test("happy path: single pronto dry run completes mark-ready without confirm step", async ({
    page,
  }) => {
    // With exactly one Pronti card the dry-run item IS the whole batch —
    // phase jumps to `completata` (no remainder → no confirm button).
    await startSendDryRun(page)

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-summary").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)
    await expect(page.getByTestId("cedolini-controlli-send-confirm")).toHaveCount(0)

    const stato = await readCedolinoStato(prontoCandidate.id)
    expect(stato).toBe("Cedolino Pronto")
  })

  test("happy path: multi-pronto dry run enables confirm for remainder", async ({ page }) => {
    await seedSecondPronto()
    await page.reload()
    await switchToControlliTab(page)

    await startSendDryRun(page)

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-confirm").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)

    await expect(page.getByTestId("cedolini-controlli-send-confirm-copy")).toContainText("1")
    await page.getByTestId("cedolini-controlli-send-confirm").click()

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-summary").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)

    const first = await readCedolinoStato(prontoCandidate.id)
    const second = await readCedolinoStato(oreMismatch.id)
    expect(first).toBe("Cedolino Pronto")
    expect(second).toBe("Cedolino Pronto")
  })

  test("AE2: dry run failure blocks confirm when cedolino attachment is missing", async ({
    page,
  }) => {
    await setCedolinoAttachment(prontoCandidate.id, null)
    await page.reload()
    await switchToControlliTab(page)

    await startSendDryRun(page)

    await expect(page.getByTestId("cedolini-controlli-send-dry-run-failed")).toBeVisible({
      timeout: BULK_SEND_TIMEOUT_MS,
    })
    await expect(page.getByTestId("cedolini-controlli-send-confirm")).toHaveCount(0)
  })

  test("AE4: already-processed row is skipped without duplicate transition", async ({ page }) => {
    await seedSecondPronto()
    // Pre-mark the first Pronti row so only the second remains UI-eligible.
    await setCedolinoStato(prontoCandidate.id, "Cedolino Pronto")
    await page.reload()
    await switchToControlliTab(page)

    await startSendDryRun(page)

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-summary").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)

    expect(await readCedolinoStato(prontoCandidate.id)).toBe("Cedolino Pronto")
    expect(await readCedolinoStato(oreMismatch.id)).toBe("Cedolino Pronto")
  })

  test("AE3: stop mid bulk job leaves already-processed rows unchanged on resume", async ({
    page,
  }) => {
    await seedSecondPronto()
    await page.reload()
    await switchToControlliTab(page)

    await startSendDryRun(page)

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-confirm").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)

    await page.getByTestId("cedolini-controlli-send-confirm").click()

    const stopButton = page.getByTestId("cedolini-controlli-send-stop")
    await expect(stopButton).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
    await stopButton.click()

    await expect
      .poll(async () => page.getByTestId("cedolini-controlli-send-summary").isVisible(), {
        timeout: BULK_SEND_TIMEOUT_MS,
      })
      .toBe(true)

    const firstStato = await readCedolinoStato(prontoCandidate.id)
    expect(["Cedolino Pronto", "Cedolino da controllare"]).toContain(firstStato)

    await page.reload()
    await switchToControlliTab(page)

    const secondStato = await readCedolinoStato(prontoCandidate.id)
    expect(secondStato).toBe(firstStato)
  })
})
