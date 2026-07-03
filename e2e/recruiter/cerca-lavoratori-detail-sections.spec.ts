import { expect, test, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
  closeWorkerDetail,
  expectLavoratoreCardVisibility,
  gotoCercaLavoratori,
  openWorkerDetail,
  openWorkerSectionEdit,
  scrollToWorkerDetailTab,
  setSearchQuery,
  waitForLavoratoreUpdateRecord,
  workerDetailLabeledInput,
  workerDetailPanel,
  workerDetailTab,
} from "../support/lavoratori"
import { selectors } from "../support/selectors"
import {
  readLavoratoreAddressField,
  readLavoratoreStringField,
  resetCercaLavoratoriDetailFixture,
} from "../support/lavoratori-mutations"

const { qualificatoMi } = E2E_LAVORATORI.lavoratori

const SECTION_EDIT_BUTTONS = [
  { tab: "Profilo", button: "Modifica profilo" },
  { tab: "Residenza", button: "Modifica indirizzo" },
  { tab: "Calendario", button: "Modifica disponibilita" },
  { tab: "Ricerca", button: "Modifica ricerca lavoro" },
  { tab: "Esperienze", button: "Modifica esperienze" },
  { tab: "Competenze", button: "Modifica skill e competenze" },
  { tab: "Documenti e dati amministrativi", button: "Modifica documenti" },
] as const

async function reloadDetail(page: Page) {
  const closeButton = page.locator(selectors.lavoratori.closeDetail)
  if (await closeButton.isVisible()) {
    await closeWorkerDetail(page)
  }
  await gotoCercaLavoratori(page)
  await setSearchQuery(page, qualificatoMi.searchText)
  await expectLavoratoreCardVisibility(page, qualificatoMi.id, true)
  await openWorkerDetail(page, qualificatoMi.id)
}

test.describe("cerca lavoratori: worker detail section editing", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await gotoCercaLavoratori(page)
    await expectLavoratoreCardVisibility(page, qualificatoMi.id, true)
    await openWorkerDetail(page, qualificatoMi.id)
  })

  test.afterEach(async () => {
    await resetCercaLavoratoriDetailFixture(qualificatoMi.id)
  })

  test("each detail section exposes an edit affordance", async ({ page }) => {
    for (const { tab, button } of SECTION_EDIT_BUTTONS) {
      if (tab !== "Profilo") {
        await scrollToWorkerDetailTab(page, tab)
      }
      await expect(
        workerDetailPanel(page).getByRole("button", { name: button, exact: true }),
      ).toBeVisible()
    }
  })

  test("section tabs scroll to related blocks", async ({ page }) => {
    const tabSections: Array<{ tab: string; marker: string }> = [
      { tab: "Residenza", marker: "Mobilita" },
      { tab: "Calendario", marker: "Calendario disponibilita" },
      { tab: "Ricerca", marker: "Ricerca Lavoro" },
      { tab: "Esperienze", marker: "Esperienze e Referenze" },
      { tab: "Competenze", marker: "Skill e Competenze" },
      { tab: "Documenti e dati amministrativi", marker: "Documenti e dati amministrativi" },
      { tab: "Ricerche", marker: "Ricerche coinvolte" },
    ]

    for (const { tab, marker } of tabSections) {
      await workerDetailTab(page, tab).click()
      await expect(workerDetailPanel(page).getByText(marker).first()).toBeVisible({
        timeout: 30_000,
      })
    }
  })

  test("profilo section autosaves telefono", async ({ page }) => {
    const telefono = "+390211112222"

    await openWorkerSectionEdit(page, "Modifica profilo")
    await expect(
      workerDetailPanel(page).getByRole("button", { name: "Termina modifica profilo" }),
    ).toBeVisible()
    const input = workerDetailPanel(page).locator('input[type="tel"]')
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(page)
    await input.fill(telefono)
    await persist

    await reloadDetail(page)
    await openWorkerSectionEdit(page, "Modifica profilo")
    await expect(workerDetailPanel(page).locator('input[type="tel"]')).toHaveValue(
      telefono,
    )
    expect(await readLavoratoreStringField(qualificatoMi.id, "telefono")).toBe(telefono)
  })

  test("residenza section autosaves citta", async ({ page }) => {
    const citta = "Brugherio"

    await scrollToWorkerDetailTab(page, "Residenza")
    await openWorkerSectionEdit(page, "Modifica indirizzo")
    const input = workerDetailLabeledInput(page, "Comune")
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(page)
    await input.fill(citta)
    await persist

    await reloadDetail(page)
    await scrollToWorkerDetailTab(page, "Residenza")
    await expect
      .poll(async () => readLavoratoreAddressField(qualificatoMi.id, "citta"), {
        timeout: 30_000,
      })
      .toBe(citta)
    await expect(workerDetailPanel(page).getByText(citta)).toBeVisible({
      timeout: 30_000,
    })
  })

  test("calendario section autosaves vincoli orari", async ({ page }) => {
    const vincoli = "E2E vincoli orari worker detail"

    await scrollToWorkerDetailTab(page, "Calendario")
    await openWorkerSectionEdit(page, "Modifica disponibilita")
    const textarea = workerDetailPanel(page).getByPlaceholder("Inserisci vincoli orari")
    await expect(textarea).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(page)
    await textarea.fill(vincoli)
    await persist

    await reloadDetail(page)
    await scrollToWorkerDetailTab(page, "Calendario")
    await expect(workerDetailPanel(page).getByText(vincoli, { exact: true })).toBeVisible()
    expect(
      await readLavoratoreStringField(qualificatoMi.id, "vincoli_orari_disponibilita"),
    ).toBe(vincoli)
  })

  test("ricerca section saves accetta paga 9 euro", async ({ page }) => {
    await scrollToWorkerDetailTab(page, "Ricerca")
    await openWorkerSectionEdit(page, "Modifica ricerca lavoro")

    const pagaField = workerDetailPanel(page).locator("div.space-y-1").filter({
      hasText: /paga di 9/i,
    })
    await expect(pagaField).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(page)
    await pagaField.getByRole("radio", { name: "Accetta", exact: true }).click()
    await persist

    await reloadDetail(page)
    await scrollToWorkerDetailTab(page, "Ricerca")
    await openWorkerSectionEdit(page, "Modifica ricerca lavoro")
    const reloadedPagaField = workerDetailPanel(page).locator("div.space-y-1").filter({
      hasText: /paga di 9/i,
    })
    await expect(
      reloadedPagaField.getByRole("radio", { name: "Accetta", exact: true }),
    ).toBeChecked()
    expect(
      await readLavoratoreStringField(
        qualificatoMi.id,
        "check_accetta_paga_9_euro_netti",
      ),
    ).toBe("Accetta")
  })

  test("esperienze section autosaves anni esperienza colf", async ({ page }) => {
    await scrollToWorkerDetailTab(page, "Esperienze")
    await openWorkerSectionEdit(page, "Modifica esperienze")

    const input = workerDetailLabeledInput(page, "Anni esp. Colf")
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(page)
    await input.fill("7")
    await persist

    await reloadDetail(page)
    await scrollToWorkerDetailTab(page, "Esperienze")
    await expect(workerDetailPanel(page).getByText("7 anni", { exact: true })).toBeVisible()
    expect(await readLavoratoreStringField(qualificatoMi.id, "anni_esperienza_colf")).toBe(
      "7",
    )
  })

  test("competenze section saves livello pulizie", async ({ page }) => {
    await scrollToWorkerDetailTab(page, "Competenze")
    await openWorkerSectionEdit(page, "Modifica skill e competenze")

    const pulizieFieldset = workerDetailPanel(page).locator("fieldset").filter({
      has: page.getByText("Pulizie", { exact: true }),
    })
    const combobox = pulizieFieldset.getByRole("combobox").first()
    await expect(combobox).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(page)
    await combobox.click()
    const options = page.getByRole("option")
    let optionLabel = ""
    const optionCount = await options.count()
    for (let index = 0; index < optionCount; index += 1) {
      const label = (await options.nth(index).textContent())?.trim() ?? ""
      if (label === "Non valutato" || label === "Senza stato" || label === "") continue
      optionLabel = label
      await options.nth(index).click()
      break
    }
    expect(optionLabel).not.toBe("")
    await persist

    await expect
      .poll(async () => readLavoratoreStringField(qualificatoMi.id, "livello_pulizie"), {
        timeout: 30_000,
      })
      .toBe(optionLabel)
    await expect(workerDetailPanel(page).getByText(optionLabel, { exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("documenti section saves stato verifica documenti", async ({ page }) => {
    await scrollToWorkerDetailTab(page, "Documenti e dati amministrativi")
    await openWorkerSectionEdit(page, "Modifica documenti")

    const combobox = workerDetailPanel(page)
      .locator("div.space-y-2")
      .filter({ has: page.getByText("Check documenti verificati da Baze", { exact: true }) })
      .getByRole("combobox")
    await expect(combobox).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(page)
    await combobox.click()
    const option = page.getByRole("option").filter({ hasNotText: "Non indicato" }).first()
    const optionLabel = (await option.textContent())?.trim() ?? ""
    await option.click()
    await persist

    await expect
      .poll(
        async () => readLavoratoreStringField(qualificatoMi.id, "stato_verifica_documenti"),
        { timeout: 30_000 },
      )
      .toBe(optionLabel)
    await expect(workerDetailPanel(page).getByText(optionLabel, { exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })
})
