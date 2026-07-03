import { expect, test } from "@playwright/test"

import { E2E_FAMIGLIA, E2E_PIPELINE } from "../constants"
import {
  readFamigliaField,
  updateFamigliaField,
} from "../support/famiglia-mutations"
import {
  closeCardSheet,
  expectCardInColumn,
  gotoPipeline,
  openCardSheet,
  setStatoInSheet,
} from "../support/pipeline"
import { resetPipelineFixture } from "../support/processo-mutations"
import {
  interceptEdgeFunction,
  mockEdgeFunctionSuccess,
} from "../support/route-errors"
import { selectors } from "../support/selectors"

const templateProcess = E2E_PIPELINE.processi.template
const { hotAttesa, bianchiWarm } = E2E_PIPELINE.processi
const { stageLabels, tipoLavoro } = E2E_PIPELINE

test.describe("pipeline: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async () => {
    await resetPipelineFixture()
  })

  test("opens with family name and primary controls, then closes", async ({ page }) => {
    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)

    await expect(dialog.getByRole("heading", { name: "E2E Famiglia Rossi" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Duplica ricerca" })).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.pipeline.sheetDialog)).toHaveCount(0)
  })

  test("header shows stato, contact meta and tipo lavoro for hot card", async ({ page }) => {
    const famigliaEmail =
      (await readFamigliaField(E2E_FAMIGLIA.id, "email")) ?? "e2e-famiglia@local.test"

    await gotoPipeline(page)
    const dialog = await openCardSheet(page, hotAttesa.id)

    await expect(dialog.getByRole("combobox").first()).toContainText(
      stageLabels.hotAttesaPrimoContatto,
    )
    await expect(dialog.getByText(famigliaEmail, { exact: true })).toBeVisible()
    await expect(dialog.getByText(/Creata il \d{2}\/\d{2}\/\d{4}/)).toBeVisible()
    await expect(dialog.getByText(tipoLavoro.colf, { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo rapporto", { exact: true })).toBeVisible()
  })

  test("onboarding sidebar tabs and primary sections are visible", async ({ page }) => {
    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)

    await expect(dialog.getByRole("tab", { name: "Orari e frequenza" })).toBeVisible()
    await expect(dialog.getByRole("tab", { name: "Luogo di lavoro" })).toBeVisible()
    await expect(dialog.getByRole("tab", { name: "Famiglia" })).toBeVisible()
    await expect(dialog.getByRole("tab", { name: "Annuncio" })).toBeVisible()
    await expect(dialog.getByText("Onboarding", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Orari e frequenza", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Luogo di lavoro", { exact: true }).first()).toBeVisible()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoPipeline(page)

    await openCardSheet(page, templateProcess.id)
    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Rossi", exact: true }),
    ).toBeVisible()

    await closeCardSheet(page)
    await openCardSheet(page, bianchiWarm.id)
    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Bianchi", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Rossi", exact: true }),
    ).toHaveCount(0)
  })

  test("contact email autosave persists after reopen", async ({ page }) => {
    const originalEmail =
      (await readFamigliaField(E2E_FAMIGLIA.id, "email")) ?? "e2e-rossi@local.test"
    const mutatedEmail = `e2e-pipeline-${Date.now()}@local.test`

    await gotoPipeline(page)

    try {
      const dialog = await openCardSheet(page, templateProcess.id)
      await dialog.getByRole("button", { name: "Modifica contatti famiglia" }).click()

      const emailInput = dialog.getByRole("textbox", { name: /email famiglia/i })
      await emailInput.fill(mutatedEmail)
      await emailInput.blur()

      await page.waitForResponse(
        (response) =>
          response.url().includes("/functions/v1/update-record") &&
          response.request().method() === "POST" &&
          response.ok(),
        { timeout: 15_000 },
      )

      await closeCardSheet(page)
      const reopened = await openCardSheet(page, templateProcess.id)
      await reopened.getByRole("button", { name: "Modifica contatti famiglia" }).click()
      await expect(
        reopened.getByRole("textbox", { name: /email famiglia/i }),
      ).toHaveValue(mutatedEmail)
      expect(await readFamigliaField(E2E_FAMIGLIA.id, "email")).toBe(mutatedEmail)
    } finally {
      await updateFamigliaField(E2E_FAMIGLIA.id, "email", originalEmail)
    }
  })

  test("invalid email shows toast and does not persist", async ({ page }) => {
    const originalEmail =
      (await readFamigliaField(E2E_FAMIGLIA.id, "email")) ?? "e2e-rossi@local.test"

    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)
    await dialog.getByRole("button", { name: "Modifica contatti famiglia" }).click()

    const emailInput = dialog.getByRole("textbox", { name: /email famiglia/i })
    await emailInput.fill("not-an-email")
    await emailInput.blur()

    await expect(page.getByText("Email famiglia non valida")).toBeVisible()
    expect(await readFamigliaField(E2E_FAMIGLIA.id, "email")).toBe(originalEmail)
  })

  test("stato change in sheet is reflected on the board after close", async ({ page }) => {
    const { mover } = E2E_PIPELINE.processi
    const { stages, stageLabels } = E2E_PIPELINE

    await gotoPipeline(page)
    await openCardSheet(page, mover.id)
    await setStatoInSheet(page, stageLabels.hotAttesaPrimoContatto)
    await closeCardSheet(page)

    await expectCardInColumn(page, mover.id, stages.hotAttesaPrimoContatto)
  })

  test("duplica dialog cancel does not call edge function", async ({ page }) => {
    let duplicaCalls = 0
    await page.route("**/functions/v1/duplica-processo-matching**", async (route) => {
      duplicaCalls += 1
      await route.continue()
    })

    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)
    await dialog.getByRole("button", { name: "Duplica ricerca" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await page.getByRole("button", { name: "Annulla" }).click()

    expect(duplicaCalls).toBe(0)
  })

  test("duplica confirm shows success toast when edge function succeeds", async ({ page }) => {
    await mockEdgeFunctionSuccess(page, "duplica-processo-matching", {
      status: "success",
    })

    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)
    await dialog.getByRole("button", { name: "Duplica ricerca" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Duplica ricerca" }).click()

    await expect(page.getByText("Ricerca duplicata")).toBeVisible()
  })

  test("duplica failure shows error toast", async ({ page }) => {
    await interceptEdgeFunction(page, "duplica-processo-matching", 500)

    await gotoPipeline(page)
    const dialog = await openCardSheet(page, templateProcess.id)
    await dialog.getByRole("button", { name: "Duplica ricerca" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Duplica ricerca" }).click()

    await expect(page.getByText(/Errore durante la duplicazione della ricerca/i)).toBeVisible()
  })
})
