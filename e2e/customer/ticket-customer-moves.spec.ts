import { expect, test } from "@playwright/test"

import { E2E_TICKET_CUSTOMER, E2E_TICKET_STAGES } from "../constants"
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
  resetTicketCustomerFixture,
} from "../support/tickets-mutations"
import { selectors } from "../support/selectors"

const { chiusuraAperto } = E2E_TICKET_CUSTOMER.tickets
const { aperto, presoInCarico } = E2E_TICKET_STAGES
const { createRapporto } = E2E_TICKET_CUSTOMER

test.describe("ticket-customer: kanban moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetTicketCustomerFixture()
    await reloadSupportTickets(page, "customer")
  })

  test("native drag-and-drop moves card to target column and persists", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    await expectCardInColumn(page, "customer", chiusuraAperto.id, aperto)

    await dragCardToColumn(page, "customer", chiusuraAperto.id, presoInCarico)
    await expectCardNotInColumn(page, "customer", chiusuraAperto.id, aperto)
    await expectCardInColumn(page, "customer", chiusuraAperto.id, presoInCarico)

    const persisted = await readTicketStato(chiusuraAperto.id)
    expect(persisted).toBe(presoInCarico)

    await reloadSupportTickets(page, "customer")
    await expectCardInColumn(page, "customer", chiusuraAperto.id, presoInCarico)
  })

  test("create dialog adds a new customer ticket in aperto", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const dialog = await openCreateDialog(page, "customer")

    await dialog.getByRole("combobox").first().click()
    await page
      .getByRole("option", {
        name: new RegExp(
          `${createRapporto.famigliaSearchText}.*${createRapporto.lavoratoreSearchText}`,
        ),
      })
      .click()
    await dialog.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: "Altro", exact: true }).click()
    await dialog.getByRole("radio", { name: "Media" }).click()
    await dialog
      .getByPlaceholder("Spiega il problema e cosa bisogna fare per risolverlo.")
      .fill("E2E customer ticket creato da test")

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

    await expect(page.locator(selectors.ticketCustomer.createDialog)).toHaveCount(0)
    await expectCardInColumn(page, "customer", createdId!, aperto)

    const persisted = await readTicketStato(createdId!)
    expect(persisted).toBe(aperto)

    await deleteTicket(createdId!)
  })
})
