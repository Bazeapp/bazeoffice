import { expect, test } from "@playwright/test"

import { E2E_ASSEGNAZIONE, E2E_PIPELINE } from "../constants"
import {
  assignRecruiterInSheet,
  closeCardSheet,
  gotoAssegnazione,
  openCardSheet,
  reloadAssegnazione,
} from "../support/assegnazione"
import {
  readProcessoAssegnazioneFields,
  resetAssegnazioneFixture,
} from "../support/processo-mutations"
import { selectors } from "../support/selectors"

const { unassignedNuova, unassignedSostituzione, assignedToday } = E2E_ASSEGNAZIONE.processi
const recruiterLabel = E2E_ASSEGNAZIONE.operatori.recruiter.displayName

test.describe("assegnazione: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssegnazioneFixture()
    await reloadAssegnazione(page)
  })

  test("opens with family name and primary sections, then closes", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await expect(
      dialog.getByRole("heading", { name: unassignedNuova.famigliaDisplayName }),
    ).toBeVisible()
    await expect(dialog.getByText("Ricerca collegata")).toBeVisible()
    await expect(dialog.getByText("Stato e assegnazione")).toBeVisible()
    await expect(dialog.getByText("Panoramica ricerca")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Vai alla ricerca" })).toBeVisible()

    await closeCardSheet(page)
    await expect(page.locator(selectors.assegnazione.sheetDialog)).toHaveCount(0)
  })

  test("header shows stato, deadline and assignment context for unassigned card", async ({
    page,
  }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await expect(dialog.getByText("Da assegnare", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText(/Deadline \d{2}\/\d{2}\/\d{4}/)).toBeVisible()
    await expect(dialog.getByText("Non assegnato", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Nuova", { exact: true })).toBeVisible()
    await expect(dialog.getByText(`ID ricerca: ${unassignedNuova.id}`)).toBeVisible()
  })

  test("shows stato badge and recruiter for scheduled card", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, assignedToday.id)

    await expect(dialog.getByText("Fare ricerca", { exact: true }).first()).toBeVisible()
    await expect(
      dialog.getByText(E2E_ASSEGNAZIONE.operatori.recruiter.displayName).first(),
    ).toBeVisible()
    await expect(dialog.getByText(`ID ricerca: ${assignedToday.id}`)).toBeVisible()
  })

  test("panoramica ricerca exposes overview field labels", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await expect(dialog.getByText("Orari e giorni", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Orario di lavoro", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Luogo", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo profilo", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Tipo lavoro", { exact: true })).toBeVisible()
  })

  test("scheduling edit mode exposes stato and assignment controls", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await dialog.getByRole("button", { name: "Modifica stato e assegnazione" }).click()
    await expect(dialog.getByText("Salvataggio automatico attivo")).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
    await expect(dialog.locator('input[type="date"]')).toHaveCount(2)
  })

  test("recruiter assignment in sheet persists after reopen", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await assignRecruiterInSheet(page, dialog, recruiterLabel)

    await closeCardSheet(page)
    const reopened = await openCardSheet(page, unassignedNuova.id)
    await expect(reopened.getByText(recruiterLabel).first()).toBeVisible()

    const persisted = await readProcessoAssegnazioneFields(unassignedNuova.id)
    expect(persisted.recruiterId).toBe(E2E_ASSEGNAZIONE.operatori.recruiter.id)
  })

  test("vai alla ricerca navigates to ricerca detail for the process", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await dialog.getByRole("button", { name: "Vai alla ricerca" }).click()

    await expect(page).toHaveURL(new RegExp(`/ricerca/${unassignedNuova.id}`), {
      timeout: 30_000,
    })
    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Rossi", exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.locator(selectors.assegnazione.sheetDialog)).toHaveCount(0)
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoAssegnazione(page)

    await openCardSheet(page, unassignedNuova.id)
    await expect(
      page.getByRole("heading", { name: unassignedNuova.famigliaDisplayName }),
    ).toBeVisible()

    await closeCardSheet(page)
    await openCardSheet(page, unassignedSostituzione.id)
    await expect(
      page.getByRole("heading", {
        name: E2E_PIPELINE.famiglie.bianchi.displayName,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: unassignedNuova.famigliaDisplayName }),
    ).toHaveCount(0)
  })
})
