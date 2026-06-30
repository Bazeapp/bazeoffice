import { expect, test, type Page } from "@playwright/test"

import { E2E_TICKET_CUSTOMER, E2E_TICKET_STAGES } from "../constants"
import {
  clearSearchQuery,
  expectTicketCardVisibility,
  expectVisibleTicketFixtureCount,
  getColumn,
  gotoSupportTickets,
  openCreateDialog,
  resetFilters,
  setSearchQuery,
  setStageFilter,
  showClosedTickets,
} from "../support/tickets"
import { selectors } from "../support/selectors"

test.describe("ticket-customer: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let ticketsPage: Page
    const { chiusuraAperto, rapportoPresoInCarico, chiuso } = E2E_TICKET_CUSTOMER.tickets

    test.beforeAll(async ({ browser }) => {
      ticketsPage = await browser.newPage()
      await gotoSupportTickets(ticketsPage, "customer")
      await expectVisibleTicketFixtureCount(ticketsPage, "customer", 2)
    })

    test.afterAll(async () => {
      await ticketsPage.close()
    })

    test.beforeEach(async () => {
      await resetFilters(ticketsPage, "customer")
      await expectVisibleTicketFixtureCount(ticketsPage, "customer", 2)
    })

    test("loads fixture cards across workflow columns", async () => {
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, true)
    })

    test("header shows title, ticket count and create action", async () => {
      await expect(
        ticketsPage.getByRole("heading", { name: selectors.ticketCustomer.heading }),
      ).toBeVisible()
      await expect(
        ticketsPage.locator('[data-slot="section-header"]').getByText(/\d+ ticket/),
      ).toBeVisible()
      await expect(ticketsPage.locator(selectors.ticketCustomer.openCreate)).toBeVisible()
    })

    test("renders all customer ticket workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_TICKET_STAGES)) {
        await expect(getColumn(ticketsPage, "customer", stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by causale and clear restores fixtures", async () => {
      await setSearchQuery(ticketsPage, "customer", chiusuraAperto.causaleSearchText)
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, false)

      await clearSearchQuery(ticketsPage, "customer")
      await expectVisibleTicketFixtureCount(ticketsPage, "customer", 2)
    })

    test("search narrows cards by family surname on linked rapporto", async () => {
      await setSearchQuery(ticketsPage, "customer", rapportoPresoInCarico.famigliaSearchText)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, true)
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, false)
    })

    test("search narrows cards by worker surname on linked rapporto", async () => {
      await setSearchQuery(ticketsPage, "customer", rapportoPresoInCarico.lavoratoreSearchText)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, true)
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(ticketsPage, "customer", "zzzz-e2e-no-match")
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, false)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, false)
    })

    test("stage filter narrows cards to a single workflow column", async () => {
      await setStageFilter(ticketsPage, "customer", E2E_TICKET_STAGES.aperto)
      await expectTicketCardVisibility(ticketsPage, "customer", chiusuraAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "customer", rapportoPresoInCarico.id, false)
    })

    test("reset filtri restores all visible fixture cards", async () => {
      await setSearchQuery(ticketsPage, "customer", rapportoPresoInCarico.lavoratoreSearchText)
      await setStageFilter(ticketsPage, "customer", E2E_TICKET_STAGES.presoInCarico)
      await ticketsPage.getByRole("button", { name: "Reset filtri" }).click()
      await expectVisibleTicketFixtureCount(ticketsPage, "customer", 2)
    })

    test("deferred closed column loads fixture after Mostra chiusi", async () => {
      await showClosedTickets(ticketsPage, "customer")
      await expectTicketCardVisibility(ticketsPage, "customer", chiuso.id, true)
    })

    test("create dialog opens with required fields and closes on cancel", async () => {
      const dialog = await openCreateDialog(ticketsPage, "customer")
      await expect(dialog.getByRole("heading", { name: "Apri un ticket" })).toBeVisible()
      await expect(dialog.getByRole("combobox").first()).toBeVisible()
      await expect(
        dialog.getByPlaceholder("Spiega il problema e cosa bisogna fare per risolverlo."),
      ).toBeVisible()
      await dialog.getByRole("button", { name: "Annulla", exact: true }).click()
      await expect(ticketsPage.locator(selectors.ticketCustomer.createDialog)).toHaveCount(0)
    })
  })
})
