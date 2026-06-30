import { expect, test } from "@playwright/test"

import { E2E_RICERCA } from "../constants"
import {
  backToRicercaBoard,
  gotoRicerca,
  openCardDetail,
  reloadRicerca,
} from "../support/ricerca"
import { resetAssegnazioneFixture } from "../support/processo-mutations"

const { unassignedNuova, assignedToday } = E2E_RICERCA.processi

test.describe("ricerca: detail view", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssegnazioneFixture()
    await reloadRicerca(page)
  })

  test("opens detail with family title and pipeline tab, then returns to board", async ({
    page,
  }) => {
    await gotoRicerca(page)
    await openCardDetail(page, unassignedNuova.id)

    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Rossi", exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("tab", { name: "Pipeline" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Mappa" })).toBeVisible()

    await backToRicercaBoard(page)
    await expect(page).toHaveURL(/\/ricerca$/)
  })

  test("scheduled card detail shows stato and recruiter context", async ({ page }) => {
    await gotoRicerca(page)
    await openCardDetail(page, assignedToday.id)

    await expect(
      page.getByRole("heading", { name: "E2E Famiglia Rossi", exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("combobox", { name: "Cambia recruiter assegnato" }),
    ).toBeVisible()
    await expect(page.getByText("fare ricerca", { exact: true }).first()).toBeVisible()
  })
})
