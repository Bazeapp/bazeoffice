import { expect, test } from "@playwright/test"

import { E2E_TICKET_CUSTOMER } from "../constants"
import {
  closeCardSheet,
  getTicketRapportoSection,
  getTicketSheetSection,
  gotoSupportTickets,
  openCardSheet,
  reloadSupportTickets,
  waitForTicketPatch,
} from "../support/tickets"
import { readTicketRapportoId, resetTicketCustomerFixture } from "../support/tickets-mutations"
import { selectors } from "../support/selectors"

const { chiusuraAperto, rapportoPresoInCarico } = E2E_TICKET_CUSTOMER.tickets
const { createRapporto } = E2E_TICKET_CUSTOMER

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

  test("header shows tag, opening date, and current stato without leaving the sheet", async ({
    page,
  }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)

    await expect(
      sheet.getByText(
        new RegExp(`${rapportoPresoInCarico.tag} · aperto il \\d{2}/\\d{2}/\\d{4}`),
      ),
    ).toBeVisible()
    await expect(sheet.getByRole("combobox").first()).toContainText(rapportoPresoInCarico.stato)
  })

  test("rapporto-linked ticket shows family, worker, category and urgency context", async ({
    page,
  }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)
    const categoriaSection = getTicketSheetSection(sheet, "Categoria e urgenza")
    const rapportoSection = getTicketRapportoSection(sheet)

    await expect(
      rapportoSection.getByText(rapportoPresoInCarico.famigliaSearchText, { exact: false }).first(),
    ).toBeVisible()
    await expect(
      rapportoSection.getByText(rapportoPresoInCarico.lavoratoreSearchText, { exact: false }).first(),
    ).toBeVisible()
    await expect(rapportoSection.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(categoriaSection.getByText(rapportoPresoInCarico.tag, { exact: true })).toBeVisible()
    await expect(
      categoriaSection.getByText(/^(Bassa|Media|Alta)$/, { exact: true }),
    ).toBeVisible()
    await expect(categoriaSection.getByText("Assegnatario:", { exact: false })).toBeVisible()
    await expect(categoriaSection.getByText("Aperto il:", { exact: false })).toBeVisible()
  })

  test("linked chiusura accordion expands with closure detail fields", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", chiusuraAperto.id)

    await sheet.getByRole("button", { name: /Chiusura rapporto/i }).click()
    await expect(sheet.getByText("Data fine rapporto", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Motivazione", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Informazioni aggiuntive", { exact: true })).toBeVisible()
    await expect(sheet.getByText("Collega rapporto alla chiusura", { exact: true })).toBeVisible()
    await expect(
      getTicketRapportoSection(sheet).getByRole("button", { name: "Rimuovi" }),
    ).toBeDisabled()
  })

  test("allegati section exposes the ticket upload slot", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)
    const allegatiSection = getTicketSheetSection(sheet, "Allegati")

    await expect(allegatiSection.getByText("Allegato ticket", { exact: true })).toBeVisible()
    await expect(allegatiSection.getByText("Drop files here or browse")).toBeVisible()
    await expect(
      allegatiSection.getByRole("button", { name: /Carica Allegato ticket|Aggiungi file a Allegato ticket/i }),
    ).toBeVisible()
  })

  test("rapporto select persists after reopen", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", chiusuraAperto.id)
    const rapportoSection = getTicketRapportoSection(sheet)

    await rapportoSection.getByRole("combobox").click()
    await page
      .getByRole("option", {
        name: new RegExp(
          `${createRapporto.famigliaSearchText}.*${createRapporto.lavoratoreSearchText}`,
        ),
      })
      .click()
    await waitForTicketPatch(page)

    await closeCardSheet(page, "customer")
    const reopened = await openCardSheet(page, "customer", chiusuraAperto.id)
    await expect(reopened.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(
      getTicketRapportoSection(reopened).getByRole("combobox"),
    ).toContainText(createRapporto.famigliaSearchText)

    const persisted = await readTicketRapportoId(chiusuraAperto.id)
    expect(persisted).toBe(createRapporto.id)
  })

  test("rimuovi clears linked rapporto in the sheet and database", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)
    const rapportoSection = getTicketRapportoSection(sheet)

    await rapportoSection.getByRole("button", { name: "Rimuovi" }).click()
    await waitForTicketPatch(page)

    await expect(sheet.getByText("Collega rapporto", { exact: true })).toBeVisible()
    await expect(rapportoSection.getByRole("button", { name: "Rimuovi" })).toBeDisabled()

    const persisted = await readTicketRapportoId(rapportoPresoInCarico.id)
    expect(persisted).toBeNull()
  })

  test("switching cards remounts detail without stale heading", async ({ page }) => {
    await gotoSupportTickets(page, "customer")

    await openCardSheet(page, "customer", chiusuraAperto.id)
    await expect(
      page.getByRole("heading", { name: new RegExp(chiusuraAperto.causaleSearchText) }),
    ).toBeVisible()

    await closeCardSheet(page, "customer")
    await openCardSheet(page, "customer", rapportoPresoInCarico.id)
    await expect(
      page.getByRole("heading", { name: new RegExp(rapportoPresoInCarico.causaleSearchText) }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: new RegExp(chiusuraAperto.causaleSearchText) }),
    ).toHaveCount(0)
  })

  test("rapporto-linked ticket navigates to rapporto detail", async ({ page }) => {
    await gotoSupportTickets(page, "customer")
    const sheet = await openCardSheet(page, "customer", rapportoPresoInCarico.id)

    await sheet.getByRole("link", { name: "Vai al rapporto" }).click()
    await expect(page).toHaveURL(
      new RegExp(`/gestione-contrattuale/rapporti-lavorativi/${rapportoPresoInCarico.rapportoId}`),
    )
    await expect(page.getByRole("tab", { name: "Contratto", exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })
})
