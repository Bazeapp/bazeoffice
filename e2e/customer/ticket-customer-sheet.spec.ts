import { expect, test } from "@playwright/test"

import { E2E_TICKET_CUSTOMER, E2E_TICKET_STAGES } from "../constants"
import {
  closeCardSheet,
  expectCardInColumn,
  expectCardNotInColumn,
  gotoSupportTickets,
  openCardSheet,
  reloadSupportTickets,
  setStatoTicketInSheet,
} from "../support/tickets"
import { readTicketStato, resetTicketCustomerFixture } from "../support/tickets-mutations"
import { selectors } from "../support/selectors"

const { chiusuraAperto, rapportoPresoInCarico } = E2E_TICKET_CUSTOMER.tickets
const { aperto, presoInCarico } = E2E_TICKET_STAGES

test.describe("ticket-customer: detail sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetTicketCustomerFixture()
    await reloadSupportTickets(page, "customer")
  })

  test("opens with causale, linked chiusura and primary sections, then closes", async ({
    page,
  }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", chiusuraAperto.id)

    await expect(
      sheet.getByRole("heading", { name: new RegExp(chiusuraAperto.causaleSearchText) }),
    ).toBeVisible()
    await expect(sheet.getByText("Record collegato", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Chiusura", { exact: true }).first()).toBeVisible()
    await expect(sheet.getByText("Collega rapporto", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Categoria e urgenza", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Allegati", { exact: true })).toBeVisible()

    await closeCardSheet(page, "customer")
    await expect(page.locator(selectors.ticketCustomer.sheetDialog)).toHaveCount(0)
  })

  test("rapporto-linked ticket shows family and worker context", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)

    await expect(
      sheet.getByText(rapportoPresoInCarico.famigliaSearchText, { exact: false }),
    ).toBeVisible()
    await expect(
      sheet.getByText(rapportoPresoInCarico.lavoratoreSearchText, { exact: false }),
    ).toBeVisible()
    await expect(sheet.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(sheet.getByText(rapportoPresoInCarico.tag, { exact: true }).first()).toBeVisible()
  })

  test("sheet stato change moves card and persists after reload", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    await expectCardInColumn(page, "customer", chiusuraAperto.id, aperto)

    await openCardSheet(page, "customer", chiusuraAperto.id)
    await setStatoTicketInSheet(page, "customer", presoInCarico)
    await closeCardSheet(page, "customer")

    await expectCardNotInColumn(page, "customer", chiusuraAperto.id, aperto)
    await expectCardInColumn(page, "customer", chiusuraAperto.id, presoInCarico)

    await reloadSupportTickets(page, "customer")
    await expectCardInColumn(page, "customer", chiusuraAperto.id, presoInCarico)

    const persisted = await readTicketStato(chiusuraAperto.id)
    expect(persisted).toBe(presoInCarico)
  })
})
