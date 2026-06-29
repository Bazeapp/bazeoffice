import { expect, test } from "@playwright/test"

import { E2E_PIPELINE } from "../constants"
import {
  applyFilters,
  clearPipelineFiltersStorage,
  E2E_FIXTURE_CARD_COUNT,
  expectE2eFixtureCardVisibility,
  expectVisibleE2eFixtureCount,
  getCard,
  gotoPipeline,
  processIdsWithPreventivoAccettato,
  processIdsWithoutPreventivoAccettato,
  resetFilters,
  selectAllTipoLavoro,
  selectTipoLavoro,
  setChiamataFilter,
  setPeriodoPreset,
  setPreventivoFilter,
  setSearchQuery,
  toolbarCombobox,
} from "../support/pipeline"

test.describe("pipeline: toolbar filters", () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await gotoPipeline(page)
    await clearPipelineFiltersStorage(page)
    await page.reload()
    await gotoPipeline(page)
    await resetFilters(page)
  })

  test("search narrows cards by family surname and reset restores the board", async ({
    page,
  }) => {
    await setSearchQuery(page, E2E_PIPELINE.famiglie.bianchi.searchText)
    await applyFilters(page)
    await expectVisibleE2eFixtureCount(page, 1)
    await expect(getCard(page, E2E_PIPELINE.processi.bianchiWarm.id)).toBeVisible()
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.template.id, false)

    await setSearchQuery(page, "")
    await applyFilters(page)
    await expectVisibleE2eFixtureCount(page, E2E_FIXTURE_CARD_COUNT)
  })

  test("preventivo accettato filter keeps only accepted cards", async ({ page }) => {
    await setPreventivoFilter(page, "yes")
    await applyFilters(page)

    for (const processId of processIdsWithPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, true)
    }
    for (const processId of processIdsWithoutPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, false)
    }
  })

  test("preventivo non accettato filter keeps the complement", async ({ page }) => {
    await setPreventivoFilter(page, "no")
    await applyFilters(page)

    for (const processId of processIdsWithoutPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, true)
    }
    for (const processId of processIdsWithPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, false)
    }
  })

  test("tipo ricerca filter narrows by job type and tutti restores", async ({ page }) => {
    await selectTipoLavoro(page, E2E_PIPELINE.tipoLavoro.colf)
    await applyFilters(page)

    const colfIds = Object.values(E2E_PIPELINE.processi)
      .filter((processo) => processo.tipoLavoro === E2E_PIPELINE.tipoLavoro.colf)
      .map((processo) => processo.id)
    const nonColfIds = Object.values(E2E_PIPELINE.processi)
      .filter((processo) => processo.tipoLavoro !== E2E_PIPELINE.tipoLavoro.colf)
      .map((processo) => processo.id)

    for (const processId of colfIds) {
      await expectE2eFixtureCardVisibility(page, processId, true)
    }
    for (const processId of nonColfIds) {
      await expectE2eFixtureCardVisibility(page, processId, false)
    }

    await selectAllTipoLavoro(page)
    await applyFilters(page)
    await expectVisibleE2eFixtureCount(page, E2E_FIXTURE_CARD_COUNT)
  })

  test("chiamata filter splits booked-call cards", async ({ page }) => {
    await setChiamataFilter(page, "yes")
    await applyFilters(page)
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.bianchiWarm.id, true)
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.template.id, false)

    await setChiamataFilter(page, "no")
    await applyFilters(page)
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.bianchiWarm.id, false)
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.template.id, true)
  })

  test("periodo ultimi 7 giorni excludes old seeded rows", async ({ page }) => {
    await setPeriodoPreset(page, "Ultimi 7 giorni")
    await applyFilters(page)

    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.warmPreventivo.id, false)
    await expectE2eFixtureCardVisibility(page, E2E_PIPELINE.processi.template.id, true)

    await setPeriodoPreset(page, "Da sempre")
    await applyFilters(page)
    await resetFilters(page)
    await expectVisibleE2eFixtureCount(page, E2E_FIXTURE_CARD_COUNT)
  })

  test("custom creato da input switches periodo to da sempre", async ({ page }) => {
    await setPeriodoPreset(page, "Ultimi 7 giorni")
    await page.getByLabel("Creato da").fill("2020-01-01T00:00")
    await applyFilters(page)

    await expect(toolbarCombobox(page, "Periodo")).toContainText("Da sempre")
  })

  test("toolbar filters persist across reload but search does not", async ({ page }) => {
    await setPreventivoFilter(page, "yes")
    await applyFilters(page)
    for (const processId of processIdsWithPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, true)
    }

    await setSearchQuery(page, E2E_PIPELINE.famiglie.bianchi.searchText)
    await applyFilters(page)
    await expectVisibleE2eFixtureCount(page, 0)

    await page.reload()
    await expect(page.getByRole("heading", { name: "Sales Pipeline" })).toBeVisible({
      timeout: 30_000,
    })

    await expect(toolbarCombobox(page, "Preventivo")).toContainText("Accettato")
    for (const processId of processIdsWithPreventivoAccettato()) {
      await expectE2eFixtureCardVisibility(page, processId, true)
    }
    await expect(page.locator('[data-testid="pipeline-search-input"]')).toHaveValue("")
  })

  test("reset filtri clears toolbar filters and search", async ({ page }) => {
    await setPreventivoFilter(page, "yes")
    await setSearchQuery(page, "Bianchi")
    await applyFilters(page)
    await expectVisibleE2eFixtureCount(page, 0)

    await resetFilters(page)
    await expectVisibleE2eFixtureCount(page, E2E_FIXTURE_CARD_COUNT)
    await expect(page.locator('[data-testid="pipeline-search-input"]')).toHaveValue("")
    await expect(toolbarCombobox(page, "Preventivo")).toContainText("Tutti")
  })

  test("search with no matches shows empty columns", async ({ page }) => {
    await setSearchQuery(page, "zzzz-e2e-no-match")
    await applyFilters(page)

    await expect(page.getByText("Nessuna ricerca").first()).toBeVisible()
    await expectVisibleE2eFixtureCount(page, 0)
  })
})
