import { expect, test, type Page } from "@playwright/test"

import { E2E_FAMIGLIA, E2E_RICERCA } from "../constants"
import {
  expandRicercaAccordionSection,
  gotoRicercaDetail,
  openRicercaAccordionSectionEdit,
  openRicercaHeaderSectionEdit,
  ricercaAccordionSection,
  ricercaDetailAside,
  ricercaFieldInput,
  waitForRicercaUpdateRecord,
} from "../support/ricerca"
import {
  readProcessoStringField,
  resetRicercaDetailSidebarFixture,
} from "../support/ricerca-mutations"
import { resetAssegnazioneFixture } from "../support/processo-mutations"

const { unassignedNuova } = E2E_RICERCA.processi
const { recruiter } = E2E_RICERCA.operatori

const SECTION_LABELS = [
  "Orari e frequenza",
  "Luogo di lavoro",
  "Famiglia",
  "Mansioni",
  "Richieste specifiche",
  "Recruiter",
  "Tempistiche",
  "Annuncio",
] as const

async function reloadDetail(page: Page) {
  await gotoRicercaDetail(page, unassignedNuova.id)
}

test.describe("ricerca: detail sidebar section editing", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await gotoRicercaDetail(page, unassignedNuova.id)
  })

  test.afterEach(async () => {
    await resetRicercaDetailSidebarFixture(unassignedNuova.id, E2E_FAMIGLIA.id)
    await resetAssegnazioneFixture()
  })

  test("each accordion section exposes an edit affordance", async ({ page }) => {
    await openRicercaHeaderSectionEdit(page)
    await expect(ricercaFieldInput(page, "Telefono")).toBeVisible()
    await ricercaDetailAside(page).getByRole("button", { name: "Annulla" }).first().click()

    for (const label of SECTION_LABELS) {
      await expect(
        ricercaAccordionSection(page, label).getByRole("button", {
          name: "Modifica sezione",
        }),
      ).toBeVisible()
    }
  })

  test("header section autosaves telefono", async ({ page }) => {
    const telefono = "+390200000000"

    await openRicercaHeaderSectionEdit(page)
    const input = ricercaFieldInput(page, "Telefono")
    const persist = waitForRicercaUpdateRecord(page)
    await input.fill(telefono)
    await persist

    await reloadDetail(page)
    await openRicercaHeaderSectionEdit(page)
    await expect(ricercaFieldInput(page, "Telefono")).toHaveValue(telefono)
  })

  test("orari e frequenza section saves ore settimanali", async ({ page }) => {
    const section = await expandRicercaAccordionSection(page, "Orari e frequenza")
    await openRicercaAccordionSectionEdit(page, "Orari e frequenza")

    await section
      .getByRole("group")
      .filter({ has: page.getByText("Ore settimanali", { exact: true }) })
      .locator("input")
      .fill("42")
    await section.getByRole("button", { name: "Salva" }).click()

    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: /Orari e frequenza salvati/i,
      }),
    ).toBeVisible({ timeout: 30_000 })

    expect(await readProcessoStringField(unassignedNuova.id, "ore_settimanale")).toBe(
      "42",
    )

    await reloadDetail(page)
    const reloadedSection = await expandRicercaAccordionSection(page, "Orari e frequenza")
    await expect(
      reloadedSection
        .getByRole("group")
        .filter({ has: page.getByText("Ore settimanali", { exact: true }) })
        .getByText("42", { exact: true }),
    ).toBeVisible()
  })

  test("luogo di lavoro section saves provincia on select", async ({ page }) => {
    await expandRicercaAccordionSection(page, "Luogo di lavoro")
    await openRicercaAccordionSectionEdit(page, "Luogo di lavoro")

    const section = ricercaAccordionSection(page, "Luogo di lavoro")
    const persist = waitForRicercaUpdateRecord(page)
    await section.getByRole("combobox").click()
    await page.getByRole("option", { name: "MI" }).click()
    await persist

    await reloadDetail(page)
    const reloaded = await expandRicercaAccordionSection(page, "Luogo di lavoro")
    await expect(reloaded.getByText("MI", { exact: true })).toBeVisible()
  })

  test("famiglia section autosaves nucleo famigliare", async ({ page }) => {
    const nucleo = "E2E nucleo famiglia sidebar"

    await expandRicercaAccordionSection(page, "Famiglia")
    await openRicercaAccordionSectionEdit(page, "Famiglia")

    const input = ricercaFieldInput(page, "Nucleo famigliare")
    const persist = waitForRicercaUpdateRecord(page)
    await input.fill(nucleo)
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Famiglia")
    await openRicercaAccordionSectionEdit(page, "Famiglia")
    await expect(ricercaFieldInput(page, "Nucleo famigliare")).toHaveValue(
      nucleo,
    )
  })

  test("mansioni section autosaves mansioni richieste", async ({ page }) => {
    const mansioni = "E2E mansioni richieste sidebar"

    await expandRicercaAccordionSection(page, "Mansioni")
    await openRicercaAccordionSectionEdit(page, "Mansioni")

    const input = ricercaFieldInput(page, "Mansioni richieste")
    const persist = waitForRicercaUpdateRecord(page)
    await input.fill(mansioni)
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Mansioni")
    await expect(page.getByText(mansioni, { exact: true })).toBeVisible()
  })

  test("richieste specifiche section toggles richiesta patente", async ({ page }) => {
    await expandRicercaAccordionSection(page, "Richieste specifiche")
    await openRicercaAccordionSectionEdit(page, "Richieste specifiche")

    const checkbox = ricercaDetailAside(page).getByRole("checkbox", {
      name: "Richiesta patente",
    })
    const persist = waitForRicercaUpdateRecord(page)
    await checkbox.click()
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Richieste specifiche")
    await openRicercaAccordionSectionEdit(page, "Richieste specifiche")
    await expect(
      ricercaDetailAside(page).getByRole("checkbox", { name: "Richiesta patente" }),
    ).toBeChecked()
    expect(await readProcessoStringField(unassignedNuova.id, "richiesta_patente")).toBe(
      "true",
    )
  })

  test("recruiter section assigns recruiter on select", async ({ page }) => {
    await expandRicercaAccordionSection(page, "Recruiter")
    await openRicercaAccordionSectionEdit(page, "Recruiter")

    const recruiterSection = ricercaAccordionSection(page, "Recruiter")
    const persist = waitForRicercaUpdateRecord(page)
    await recruiterSection.getByRole("combobox").click()
    await page.getByRole("option", { name: recruiter.displayName }).click()
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Recruiter")
    await expect(page.getByText(recruiter.displayName, { exact: true })).toBeVisible()
  })

  test("tempistiche section autosaves disponibilita colloqui", async ({ page }) => {
    const disponibilita = "E2E disponibilita colloqui sidebar"

    await expandRicercaAccordionSection(page, "Tempistiche")
    await openRicercaAccordionSectionEdit(page, "Tempistiche")

    const input = ricercaFieldInput(page, "Disponibilità colloqui")
    const persist = waitForRicercaUpdateRecord(page)
    await input.fill(disponibilita)
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Tempistiche")
    await openRicercaAccordionSectionEdit(page, "Tempistiche")
    await expect(ricercaFieldInput(page, "Disponibilità colloqui")).toHaveValue(
      disponibilita,
    )
  })

  test("annuncio section autosaves testo whatsapp", async ({ page }) => {
    const testo = "E2E annuncio WhatsApp sidebar"

    await expandRicercaAccordionSection(page, "Annuncio")
    await openRicercaAccordionSectionEdit(page, "Annuncio")

    const input = ricercaFieldInput(page, "Testo per WhatsApp")
    const persist = waitForRicercaUpdateRecord(page)
    await input.fill(testo)
    await persist

    await reloadDetail(page)
    await expandRicercaAccordionSection(page, "Annuncio")
    await expect(page.getByText(testo, { exact: true })).toBeVisible()
  })
})
