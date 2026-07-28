import { expect, test, type Page } from "@playwright/test"

import { E2E_LAVORATORI } from "../constants"
import {
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

const TAB_SECTIONS: Array<{ tab: string; marker: string }> = [
  { tab: "Residenza", marker: "Mobilita" },
  { tab: "Calendario", marker: "Calendario disponibilita" },
  { tab: "Ricerca", marker: "Ricerca Lavoro" },
  { tab: "Esperienze", marker: "Esperienze e Referenze" },
  { tab: "Competenze", marker: "Skill e Competenze" },
  { tab: "Documenti e dati amministrativi", marker: "Documenti e dati amministrativi" },
  { tab: "Ricerche", marker: "Ricerche coinvolte" },
]

async function reloadDetail(page: Page) {
  await gotoCercaLavoratori(page)
  await setSearchQuery(page, qualificatoMi.searchText)
  await expectLavoratoreCardVisibility(page, qualificatoMi.id, true)
  await openWorkerDetail(page, qualificatoMi.id)
}

test.describe("cerca lavoratori: worker detail section editing", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  let lavoratoriPage: Page

  test.beforeAll(async ({ browser }) => {
    lavoratoriPage = await browser.newPage()
  })

  test.afterAll(async () => {
    await lavoratoriPage.close()
  })

  test.beforeEach(async () => {
    await gotoCercaLavoratori(lavoratoriPage)
    await expectLavoratoreCardVisibility(lavoratoriPage, qualificatoMi.id, true)
    await openWorkerDetail(lavoratoriPage, qualificatoMi.id)
  })

  test.afterEach(async () => {
    await resetCercaLavoratoriDetailFixture(qualificatoMi.id)
  })

  test("section tabs scroll to related blocks and expose edit affordances", async () => {
    for (const { tab, button } of SECTION_EDIT_BUTTONS) {
      if (tab !== "Profilo") {
        await scrollToWorkerDetailTab(lavoratoriPage, tab)
      }
      await expect(
        workerDetailPanel(lavoratoriPage).getByRole("button", {
          name: button,
          exact: true,
        }),
      ).toBeVisible()
    }

    for (const { tab, marker } of TAB_SECTIONS) {
      await workerDetailTab(lavoratoriPage, tab).click()
      await expect(workerDetailPanel(lavoratoriPage).getByText(marker).first()).toBeVisible({
        timeout: 30_000,
      })
    }
  })

  test("profilo section autosaves telefono and survives remount", async () => {
    const telefono = "+390211112222"

    await openWorkerSectionEdit(lavoratoriPage, "Modifica profilo")
    await expect(
      workerDetailPanel(lavoratoriPage).getByRole("button", {
        name: "Termina modifica profilo",
      }),
    ).toBeVisible()
    const input = workerDetailPanel(lavoratoriPage).locator('input[type="tel"]')
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await input.fill(telefono)
    await persist

    await reloadDetail(lavoratoriPage)
    await openWorkerSectionEdit(lavoratoriPage, "Modifica profilo")
    await expect(
      workerDetailPanel(lavoratoriPage).locator('input[type="tel"]'),
    ).toHaveValue(telefono)
    expect(await readLavoratoreStringField(qualificatoMi.id, "telefono")).toBe(telefono)
  })

  test("residenza section autosaves citta", async () => {
    const citta = "Brugherio"

    await scrollToWorkerDetailTab(lavoratoriPage, "Residenza")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica indirizzo")
    const input = workerDetailLabeledInput(lavoratoriPage, "Comune")
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await input.fill(citta)
    await persist

    await expect
      .poll(async () => readLavoratoreAddressField(qualificatoMi.id, "citta"), {
        timeout: 30_000,
      })
      .toBe(citta)
    await expect(input).toHaveValue(citta)
  })

  test("calendario section autosaves vincoli orari", async () => {
    const vincoli = "E2E vincoli orari worker detail"

    await scrollToWorkerDetailTab(lavoratoriPage, "Calendario")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica disponibilita")
    const textarea = workerDetailPanel(lavoratoriPage).getByPlaceholder(
      "Inserisci vincoli orari",
    )
    await expect(textarea).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await textarea.fill(vincoli)
    await persist

    expect(
      await readLavoratoreStringField(qualificatoMi.id, "vincoli_orari_disponibilita"),
    ).toBe(vincoli)
    await expect(textarea).toHaveValue(vincoli)
  })

  test("ricerca section saves accetta paga 9 euro", async () => {
    await scrollToWorkerDetailTab(lavoratoriPage, "Ricerca")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica ricerca lavoro")

    const pagaField = workerDetailPanel(lavoratoriPage).locator("div.space-y-1").filter({
      hasText: /paga di 9/i,
    })
    await expect(pagaField).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await pagaField.getByRole("radio", { name: "Accetta", exact: true }).click()
    await persist

    await expect(
      pagaField.getByRole("radio", { name: "Accetta", exact: true }),
    ).toBeChecked()
    expect(
      await readLavoratoreStringField(
        qualificatoMi.id,
        "check_accetta_paga_9_euro_netti",
      ),
    ).toBe("Accetta")
  })

  test("esperienze section autosaves anni esperienza colf", async () => {
    await scrollToWorkerDetailTab(lavoratoriPage, "Esperienze")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica esperienze")

    const input = workerDetailLabeledInput(lavoratoriPage, "Anni esp. Colf")
    await expect(input).toBeVisible()
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await input.fill("7")
    await persist

    expect(await readLavoratoreStringField(qualificatoMi.id, "anni_esperienza_colf")).toBe(
      "7",
    )
    await expect(input).toHaveValue("7")
  })

  test("competenze section saves livello pulizie", async () => {
    await scrollToWorkerDetailTab(lavoratoriPage, "Competenze")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica skill e competenze")

    const pulizieFieldset = workerDetailPanel(lavoratoriPage).locator("fieldset").filter({
      has: lavoratoriPage.getByText("Pulizie", { exact: true }),
    })
    const combobox = pulizieFieldset.getByRole("combobox").first()
    await expect(combobox).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await combobox.click()
    const options = lavoratoriPage.getByRole("option")
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
    await expect(
      workerDetailPanel(lavoratoriPage).getByText(optionLabel, { exact: true }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("documenti section saves stato verifica documenti", async () => {
    await scrollToWorkerDetailTab(lavoratoriPage, "Documenti e dati amministrativi")
    await openWorkerSectionEdit(lavoratoriPage, "Modifica documenti")

    const combobox = workerDetailPanel(lavoratoriPage)
      .locator("div.space-y-2")
      .filter({
        has: lavoratoriPage.getByText("Check documenti verificati da Baze", {
          exact: true,
        }),
      })
      .getByRole("combobox")
    await expect(combobox).toBeVisible({ timeout: 30_000 })
    const persist = waitForLavoratoreUpdateRecord(lavoratoriPage)
    await combobox.click()
    const option = lavoratoriPage
      .getByRole("option")
      .filter({ hasNotText: "Non indicato" })
      .first()
    const optionLabel = (await option.textContent())?.trim() ?? ""
    await option.click()
    await persist

    await expect
      .poll(
        async () => readLavoratoreStringField(qualificatoMi.id, "stato_verifica_documenti"),
        { timeout: 30_000 },
      )
      .toBe(optionLabel)
    await expect(
      workerDetailPanel(lavoratoriPage).getByText(optionLabel, { exact: true }),
    ).toBeVisible({ timeout: 30_000 })
  })
})
