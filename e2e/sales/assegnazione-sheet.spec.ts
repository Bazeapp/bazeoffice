import { expect, test } from "@playwright/test"

import { E2E_ASSEGNAZIONE } from "../constants"
import {
  closeCardSheet,
  gotoAssegnazione,
  openCardSheet,
  reloadAssegnazione,
} from "../support/assegnazione"
import { resetAssegnazioneFixture } from "../support/processo-mutations"
import { selectors } from "../support/selectors"

const { unassignedNuova, assignedToday } = E2E_ASSEGNAZIONE.processi

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

  test("shows stato badge and recruiter for scheduled card", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, assignedToday.id)

    await expect(dialog.getByText("Fare ricerca", { exact: true }).first()).toBeVisible()
    await expect(
      dialog.getByText(E2E_ASSEGNAZIONE.operatori.recruiter.displayName).first(),
    ).toBeVisible()
    await expect(dialog.getByText(`ID ricerca: ${assignedToday.id}`)).toBeVisible()
  })

  test("scheduling edit mode exposes stato and assignment controls", async ({ page }) => {
    await gotoAssegnazione(page)
    const dialog = await openCardSheet(page, unassignedNuova.id)

    await dialog.getByRole("button", { name: "Modifica stato e assegnazione" }).click()
    await expect(dialog.getByText("Salvataggio automatico attivo")).toBeVisible()
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
    await expect(dialog.locator('input[type="date"]')).toHaveCount(2)
  })
})
