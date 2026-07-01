import { expect, test } from "@playwright/test"

import { E2E_TICKET_PAYROLL, E2E_TICKET_STAGES } from "../constants"
import {
  closeCardSheet,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoSupportTickets,
  openCardSheet,
  reloadSupportTickets,
  setStatoTicketInSheet,
} from "../support/tickets"
import { readTicketStato, resetTicketPayrollFixture } from "../support/tickets-mutations"
import { selectors } from "../support/selectors"

const { cedolinoAperto, contributiPresoInCarico } = E2E_TICKET_PAYROLL.tickets
const { aperto, presoInCarico } = E2E_TICKET_STAGES

test.describe("ticket-payroll: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetTicketPayrollFixture()
    await reloadSupportTickets(page, "payroll")
  })

  test("opens with causale, linked cedolino and primary sections, then closes", async ({
    page,
  }) => {
    await gotoSupportTickets(page, "payroll")
    const sheet = await openCardSheet(page, "payroll", cedolinoAperto.id)

    await expect(
      sheet.getByRole("heading", { name: cedolinoAperto.causaleSearchText }),
    ).toBeVisible()
    await expect(sheet.getByText("Record collegato", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Cedolino", { exact: true }).first()).toBeVisible()
    await expect(sheet.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Categoria e urgenza", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Allegati", { exact: true })).toBeVisible()

    await closeCardSheet(page, "payroll")
    await expect(page.locator(selectors.ticketPayroll.sheetDialog)).toHaveCount(0)
  })

  test("contributi-linked ticket shows payroll category context", async ({ page }) => {
    await gotoSupportTickets(page, "payroll")
    const sheet = await openCardSheet(page, "payroll", contributiPresoInCarico.id)

    await expect(
      sheet.getByText(contributiPresoInCarico.famigliaSearchText, { exact: false }),
    ).toBeVisible()
    await expect(sheet.getByText("Contributi", { exact: true }).first()).toBeVisible()
    await expect(sheet.getByText("Rapporto collegato", { exact: true })).toBeVisible()
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoSupportTickets(page, "payroll")
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, aperto)

    await openCardSheet(page, "payroll", cedolinoAperto.id)
    await setStatoTicketInSheet(page, "payroll", presoInCarico)
    await closeCardSheet(page, "payroll")

    await expectCardNotInColumn(page, "payroll", cedolinoAperto.id, aperto)
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, presoInCarico)

    await reloadSupportTickets(page, "payroll")
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, presoInCarico)

    const persisted = await readTicketStato(cedolinoAperto.id)
    expect(persisted).toBe(presoInCarico)
  })

  test("rapporto-linked ticket navigates to rapporto detail", async ({ page }) => {
    await gotoSupportTickets(page, "payroll")
    const sheet = await openCardSheet(page, "payroll", cedolinoAperto.id)

    await sheet.getByRole("link", { name: "Vai al rapporto" }).click()
    await expect(page).toHaveURL(new RegExp(`/gestione-contrattuale/rapporti-lavorativi/`))
    await expect(page.getByRole("tab", { name: "Contratto", exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })
})
