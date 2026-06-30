import { expect, test } from "@playwright/test"

import { E2E_TICKET_PAYROLL, E2E_TICKET_STAGES } from "../constants"
import {
  dragCardToColumn,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoSupportTickets,
  openCreateDialog,
  reloadSupportTickets,
} from "../support/tickets"
import {
  deleteTicket,
  readTicketStato,
  resetTicketPayrollFixture,
} from "../support/tickets-mutations"
import { selectors } from "../support/selectors"

const { cedolinoAperto } = E2E_TICKET_PAYROLL.tickets
const { aperto, presoInCarico } = E2E_TICKET_STAGES
const { createRapporto } = E2E_TICKET_PAYROLL

test.describe("ticket-payroll: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetTicketPayrollFixture()
    await reloadSupportTickets(page, "payroll")
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoSupportTickets(page, "payroll")
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, aperto)

    await dragCardToColumn(page, "payroll", cedolinoAperto.id, presoInCarico)
    await expectCardNotInColumn(page, "payroll", cedolinoAperto.id, aperto)
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, presoInCarico)

    const persisted = await readTicketStato(cedolinoAperto.id)
    expect(persisted).toBe(presoInCarico)

    await reloadSupportTickets(page, "payroll")
    await expectCardInColumn(page, "payroll", cedolinoAperto.id, presoInCarico)
  })

  test("create dialog adds a new payroll ticket in aperto", async ({ page }) => {
    await gotoSupportTickets(page, "payroll")
    const dialog = await openCreateDialog(page, "payroll")

    await dialog.getByRole("combobox").first().click()
    await page
      .getByRole("option", {
        name: new RegExp(
          `${createRapporto.famigliaSearchText}.*${createRapporto.lavoratoreSearchText}`,
        ),
      })
      .click()
    await dialog.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: "Presenze", exact: true }).click()
    await dialog.getByRole("radio", { name: "Bassa" }).click()
    await dialog
      .getByPlaceholder("Spiega il problema e cosa bisogna fare per risolverlo.")
      .fill("E2E payroll ticket creato da test")

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/create-record") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    )
    await dialog.getByRole("button", { name: "Apri ticket" }).click()
    const response = await createResponse
    const body = (await response.json()) as { row?: { id?: string } }
    const createdId = body.row?.id
    expect(createdId).toBeTruthy()

    await expect(page.locator(selectors.ticketPayroll.createDialog)).toHaveCount(0)
    await expectCardInColumn(page, "payroll", createdId!, aperto)

    const persisted = await readTicketStato(createdId!)
    expect(persisted).toBe(aperto)

    await deleteTicket(createdId!)
  })
})
