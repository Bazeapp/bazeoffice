import { expect, test, type Page } from "@playwright/test"

import { E2E_TICKET_PAYROLL, E2E_TICKET_STAGES } from "../constants"
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

test.describe("ticket-payroll: board filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let ticketsPage: Page
    const { cedolinoAperto, contributiPresoInCarico, chiuso } = E2E_TICKET_PAYROLL.tickets

    test.beforeAll(async ({ browser }) => {
      ticketsPage = await browser.newPage()
      await gotoSupportTickets(ticketsPage, "payroll")
      await expectVisibleTicketFixtureCount(ticketsPage, "payroll", 2)
    })

    test.afterAll(async () => {
      await ticketsPage.close()
    })

    test.beforeEach(async () => {
      await resetFilters(ticketsPage, "payroll")
      await expectVisibleTicketFixtureCount(ticketsPage, "payroll", 2)
    })

    test("loads fixture cards across workflow columns", async () => {
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, true)
    })

    test("header shows title, ticket count and create action", async () => {
      await expect(
        ticketsPage.getByRole("heading", { name: selectors.ticketPayroll.heading }),
      ).toBeVisible()
      await expect(
        ticketsPage.locator('[data-slot="section-header"]').getByText(/\d+ ticket/),
      ).toBeVisible()
      await expect(ticketsPage.locator(selectors.ticketPayroll.openCreate)).toBeVisible()
    })

    test("renders all payroll ticket workflow columns", async () => {
      for (const stageLabel of Object.values(E2E_TICKET_STAGES)) {
        await expect(getColumn(ticketsPage, "payroll", stageLabel)).toBeVisible()
      }
    })

    test("search narrows cards by causale and clear restores fixtures", async () => {
      await setSearchQuery(ticketsPage, "payroll", cedolinoAperto.causaleSearchText)
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, false)

      await clearSearchQuery(ticketsPage, "payroll")
      await expectVisibleTicketFixtureCount(ticketsPage, "payroll", 2)
    })

    test("search narrows cards by payroll-specific causale keyword", async () => {
      await setSearchQuery(ticketsPage, "payroll", "cedolino fixture")
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, false)
    })

    test("search narrows cards by contributi-specific causale keyword", async () => {
      await setSearchQuery(ticketsPage, "payroll", "contributi fixture")
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, true)
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, false)
    })

    test("search with no matches hides all fixture cards", async () => {
      await setSearchQuery(ticketsPage, "payroll", "zzzz-e2e-no-match")
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, false)
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, false)
    })

    test("stage filter narrows cards to a single workflow column", async () => {
      await setStageFilter(ticketsPage, "payroll", E2E_TICKET_STAGES.aperto)
      await expectTicketCardVisibility(ticketsPage, "payroll", cedolinoAperto.id, true)
      await expectTicketCardVisibility(ticketsPage, "payroll", contributiPresoInCarico.id, false)
    })

    test("reset filtri restores all visible fixture cards", async () => {
      await setSearchQuery(ticketsPage, "payroll", contributiPresoInCarico.lavoratoreSearchText)
      await setStageFilter(ticketsPage, "payroll", E2E_TICKET_STAGES.presoInCarico)
      await ticketsPage.getByRole("button", { name: "Reset filtri" }).click()
      await expectVisibleTicketFixtureCount(ticketsPage, "payroll", 2)
    })

    test("deferred closed column loads fixture after Mostra chiusi", async () => {
      await showClosedTickets(ticketsPage, "payroll")
      await expectTicketCardVisibility(ticketsPage, "payroll", chiuso.id, true)
    })

    test("create dialog opens with required fields and closes on cancel", async () => {
      const dialog = await openCreateDialog(ticketsPage, "payroll")
      await expect(dialog.getByRole("heading", { name: "Apri un ticket" })).toBeVisible()
      await expect(dialog.getByRole("combobox").first()).toBeVisible()
      await expect(
        dialog.getByPlaceholder("Spiega il problema e cosa bisogna fare per risolverlo."),
      ).toBeVisible()
      await dialog.getByRole("button", { name: "Annulla", exact: true }).click()
      await expect(ticketsPage.locator(selectors.ticketPayroll.createDialog)).toHaveCount(0)
    })
  })
})
