import { expect, test } from "@playwright/test"

import { E2E_ASSUNZIONI } from "../constants"
import {
  assunzioneSheetDialog,
  assunzioneSheetLabeledInput,
  gotoAssunzioni,
  openCardSheet,
  waitForAssunzioneUpdateRecord,
  waitForAssunzioniDetail,
} from "../support/assunzioni"
import {
  readRapportoNumberField,
  resetAssunzioneSheetFixture,
} from "../support/rapporti-mutations"

const { avviarePratica, inviataRichiestaDati } = E2E_ASSUNZIONI.rapporti

const CONTESTO_PRATICA_FIELDS = [
  "Stato assunzione",
  "Tipologia contratto",
  "Tipo rapporto",
  "Data di assunzione",
  "ID rapporto INPS",
  "Cod. Rapporto WebColf",
  "Fee concordata",
  "URL origine",
  "Sconto applicato",
  "Cod. Lavoratore WebColf",
] as const

const DATORE_SECTIONS = [
  "Riepilogo datore",
  "Informazioni generali",
  "Cittadini extracomunitari",
  "Convivenza e orario (form famiglia)",
  "Altri dettagli (form famiglia)",
  "Documenti datore",
] as const

const LAVORATORE_SECTIONS = [
  "Riepilogo lavoratore",
  "Informazioni generali",
  "Dati bancari",
  "Cittadini extracomunitari",
  "Dati lavoratore",
  "Documenti lavoratore",
] as const

test.describe("assunzioni: detail sheet section coverage", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.afterEach(async () => {
    await resetAssunzioneSheetFixture(avviarePratica.id)
    await resetAssunzioneSheetFixture(inviataRichiestaDati.id)
  })

  test("linked rapporto summary shows navigation and contract metadata", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)

    await expect(dialog.getByText("Rapporto collegato", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Vai al rapporto" })).toBeVisible()
    await expect(
      dialog.getByText(
        new RegExp(`${avviarePratica.famigliaSearchText}.*${avviarePratica.lavoratoreSearchText}`),
      ).first(),
    ).toBeVisible()
    await expect(dialog.getByText("Tipo", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Ore sett.", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Inizio", { exact: true }).first()).toBeVisible()
  })

  test("contesto pratica exposes all editable practice fields", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)

    for (const label of CONTESTO_PRATICA_FIELDS) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(dialog.getByRole("combobox").first()).toBeVisible()
  })

  test("documenti del rapporto section shows upload slots", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)

    await expect(dialog.getByText("Documenti del rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Accordo di lavoro", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Ricevuta INPS", { exact: true }).first()).toBeVisible()
  })

  test("orario e paga rapporto section exposes schedule and pay fields", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)

    await expect(dialog.getByText("Orario e paga rapporto", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Distribuzione ore settimanali", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Parte da domenica", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Paga oraria", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Paga mensile", { exact: true })).toBeVisible()
  })

  test("associazione form section shows searchable link field", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await expect(dialog.getByText("Associazione form", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Form assunzione famiglia", { exact: true })).toBeVisible()
    await expect(dialog.getByPlaceholder("Nome, cognome o email")).toBeVisible()
  })

  test("datore target shows all datore detail sections", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await dialog.getByText("Datore collegato", { exact: true }).click()

    for (const section of DATORE_SECTIONS) {
      await expect(
        dialog.locator("p.ui-type-section", { hasText: section }).first(),
      ).toBeVisible({ timeout: 10_000 })
    }
    await expect(dialog.getByText("Documento identita", { exact: true }).first()).toBeVisible()
    await expect(dialog.getByText("Delega INPS", { exact: true }).first()).toBeVisible()
  })

  test("lavoratore target shows all lavoratore detail sections", async ({ page }) => {
    await gotoAssunzioni(page)
    const dialog = await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)

    await dialog.getByText("Lavoratore collegato", { exact: true }).click()

    for (const section of LAVORATORE_SECTIONS) {
      await expect(
        dialog.locator("p.ui-type-section", { hasText: section }).first(),
      ).toBeVisible({ timeout: 10_000 })
    }
    await expect(dialog.getByText("Documento identità", { exact: true }).first()).toBeVisible()
  })

  test("contesto pratica autosaves codice rapporto webcolf", async ({ page }) => {
    const codice = "515151"

    await gotoAssunzioni(page)
    await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)

    const input = assunzioneSheetLabeledInput(page, "Cod. Rapporto WebColf")
    await expect(input).toBeVisible()
    const persist = waitForAssunzioneUpdateRecord(page)
    await input.fill(codice)
    await persist

    await page.keyboard.press("Escape")
    await expect(assunzioneSheetDialog(page)).toHaveCount(0)

    await openCardSheet(page, avviarePratica.id)
    await waitForAssunzioniDetail(page)
    await expect(assunzioneSheetLabeledInput(page, "Cod. Rapporto WebColf")).toHaveValue(codice)
    expect(await readRapportoNumberField(avviarePratica.id, "codice_datore_webcolf")).toBe(
      Number(codice),
    )
  })
})
