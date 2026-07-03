import { expect, test, type Page } from "@playwright/test"

import {
  E2E_CEDOLINI,
  E2E_CHIUSURE,
  E2E_CONTRIBUTI_INPS,
  E2E_RAPPORTI,
  E2E_TICKET_CUSTOMER,
  E2E_VARIAZIONI,
} from "../constants"
import {
  gotoRapporti,
  openRapportoContrattoEdit,
  rapportoDetailLabeledInput,
  rapportoDetailPanel,
  scrollToRapportoDetailTab,
  waitForRapportoDetail,
  waitForRapportoUpdateRecord,
} from "../support/rapporti"
import {
  readRapportoNumberField,
  resetRapportoDetailFixture,
} from "../support/rapporti-mutations"

const { attivo } = E2E_RAPPORTI.rapporti
const { rapportoPresoInCarico } = E2E_TICKET_CUSTOMER.tickets
const { dimissioni } = E2E_CHIUSURE.chiusure
const { presaInCarico } = E2E_VARIAZIONI.variazioni
const { daRichiedere } = E2E_CONTRIBUTI_INPS.contributi

const TAB_SECTIONS = [
  { tab: "Contratto", marker: "Caratteristiche del rapporto" },
  { tab: "Preventivo", marker: "Preventivo collegato" },
  { tab: "Datore e Lavoratore", marker: "Datore e lavoratore" },
  { tab: "Tickets", marker: "Tickets" },
  { tab: "Cedolini", marker: "Cedolini" },
  { tab: "Contributi", marker: "Contributi INPS" },
  { tab: "Variazioni", marker: "Variazioni contrattuali" },
  { tab: "Chiusure", marker: "Chiusure" },
] as const

async function reloadDetail(page: Page) {
  await gotoRapporti(page, attivo.id)
  await waitForRapportoDetail(page)
}

test.describe("rapporti lavorativi: detail section coverage", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await gotoRapporti(page, attivo.id)
    await waitForRapportoDetail(page)
  })

  test.afterEach(async () => {
    await resetRapportoDetailFixture(attivo.id)
  })

  test("each section tab scrolls to related blocks", async ({ page }) => {
    for (const { tab, marker } of TAB_SECTIONS) {
      await scrollToRapportoDetailTab(page, tab)
      await expect(rapportoDetailPanel(page).getByText(marker, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      })
    }
  })

  test("contratto section exposes edit affordance and read-only metadata", async ({ page }) => {
    await expect(
      rapportoDetailPanel(page).getByRole("button", {
        name: "Modifica caratteristiche del rapporto",
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.getByText("Tipo contratto", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Tipo rapporto", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Distribuzione ore settimanali", { exact: true })).toBeVisible()
    await expect(page.getByText(`${attivo.oreSettimanali}h/sett`).first()).toBeVisible()
  })

  test("contratto section autosaves codice rapporto webcolf", async ({ page }) => {
    const codice = "424242"

    await openRapportoContrattoEdit(page)
    await expect(
      rapportoDetailPanel(page).getByRole("button", {
        name: "Chiudi modifica caratteristiche del rapporto",
        exact: true,
      }),
    ).toBeVisible()

    const input = rapportoDetailLabeledInput(page, "Cod. rapporto Webcolf")
    await expect(input).toBeVisible()
    const persist = waitForRapportoUpdateRecord(page)
    await input.fill(codice)
    await persist

    await reloadDetail(page)
    await openRapportoContrattoEdit(page)
    await expect(input).toHaveValue(codice)
    expect(await readRapportoNumberField(attivo.id, "codice_datore_webcolf")).toBe(Number(codice))
  })

  test("preventivo section shows fee, sconto and URL origine fields", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Preventivo")
    await expect(rapportoDetailLabeledInput(page, "Fee concordata")).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Sconto applicato", { exact: true })).toBeVisible()
    await expect(page.getByText("URL origine", { exact: true })).toBeVisible()
  })

  test("datore e lavoratore section shows related subjects and document slots", async ({
    page,
  }) => {
    await scrollToRapportoDetailTab(page, "Datore e Lavoratore")
    const datoreSection = rapportoDetailPanel(page).getByText("Datore e lavoratore", {
      exact: true,
    })
    await expect(datoreSection).toBeVisible()
    await expect(rapportoDetailPanel(page).getByText("Datore", { exact: true }).first()).toBeVisible()
    await expect(rapportoDetailPanel(page).getByText("Lavoratore", { exact: true }).first()).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText(attivo.famigliaSearchText, { exact: false }).first(),
    ).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText(attivo.lavoratoreSearchText, { exact: false }).first(),
    ).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText("Accordo di lavoro", { exact: true }).first(),
    ).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText("Ricevuta INPS", { exact: true }).first(),
    ).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText("Delega INPS", { exact: true }).first(),
    ).toBeVisible()
  })

  test("tickets section shows linked ticket for active rapporto", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Tickets")
    await expect(
      rapportoDetailPanel(page).getByText(rapportoPresoInCarico.causaleSearchText, {
        exact: false,
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailPanel(page).getByRole("button", { name: "Apri un ticket", exact: true }),
    ).toBeVisible()
  })

  test("cedolini section shows linked payroll month", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Cedolini")
    await expect(
      rapportoDetailPanel(page).getByText(E2E_CEDOLINI.monthLabel, { exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailPanel(page).getByText(E2E_CEDOLINI.stages.todo, { exact: true }).first(),
    ).toBeVisible()
  })

  test("contributi section shows linked INPS contribution", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Contributi")
    await expect(
      rapportoDetailPanel(page).getByText("Contributi INPS", { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailPanel(page).getByText(daRichiedere.importoSearchText, { exact: false }).first(),
    ).toBeVisible()
    await expect(
      rapportoDetailPanel(page).getByText(daRichiedere.stato, { exact: false }).first(),
    ).toBeVisible()
  })

  test("variazioni section shows linked contractual variation", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Variazioni")
    await expect(
      rapportoDetailPanel(page).getByText(presaInCarico.variazioneSearchText, { exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailPanel(page).getByText(presaInCarico.stato, { exact: false }),
    ).toBeVisible()
  })

  test("chiusure section shows linked closure", async ({ page }) => {
    await scrollToRapportoDetailTab(page, "Chiusure")
    await expect(
      rapportoDetailPanel(page).getByText("Dimissioni con preavviso", { exact: true }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      rapportoDetailPanel(page).getByText(dimissioni.stato, { exact: false }).first(),
    ).toBeVisible()
  })
})
