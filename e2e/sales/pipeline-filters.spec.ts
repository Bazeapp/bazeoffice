import { expect, test, type Page } from "@playwright/test"

import { E2E_PIPELINE } from "../constants"
import {
  applyFilters,
  clearPipelineFiltersStorage,
  E2E_FIXTURE_CARD_COUNT,
  expectE2eFixtureCardVisibility,
  expectE2eFixtureCardsVisible,
  expectVisibleE2eFixtureCount,
  getCard,
  gotoPipeline,
  installCleanPipelineFiltersStorage,
  processIdsWithPreventivoAccettato,
  processIdsWithoutPreventivoAccettato,
  reloadPipeline,
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

  test.describe("filters", () => {
    test.describe.configure({ mode: "serial" })

    let pipelinePage: Page

    test.beforeAll(async ({ browser }) => {
      pipelinePage = await browser.newPage()
      await installCleanPipelineFiltersStorage(pipelinePage)
      await gotoPipeline(pipelinePage)
    })

    test.afterAll(async () => {
      await pipelinePage.close()
    })

    test.beforeEach(async () => {
      await resetFilters(pipelinePage)
    })

    test("search narrows cards by family surname and reset restores the board", async () => {
      const { bianchiWarm, template } = E2E_PIPELINE.processi

      await setSearchQuery(pipelinePage, E2E_PIPELINE.famiglie.bianchi.searchText)
      await applyFilters(pipelinePage)
      await expect(getCard(pipelinePage, bianchiWarm.id)).toBeVisible()
      await expectE2eFixtureCardVisibility(pipelinePage, template.id, false)

      await resetFilters(pipelinePage)
      await expectE2eFixtureCardsVisible(pipelinePage, [bianchiWarm.id, template.id])
    })

    test("preventivo accettato filter keeps only accepted cards", async () => {
      await setPreventivoFilter(pipelinePage, "yes")
      await applyFilters(pipelinePage)

      for (const processId of processIdsWithPreventivoAccettato()) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, true)
      }
      for (const processId of processIdsWithoutPreventivoAccettato()) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, false)
      }
    })

    test("preventivo non accettato filter keeps the complement", async () => {
      await setPreventivoFilter(pipelinePage, "no")
      await applyFilters(pipelinePage)

      for (const processId of processIdsWithoutPreventivoAccettato()) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, true)
      }
      for (const processId of processIdsWithPreventivoAccettato()) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, false)
      }
    })

    test("tipo ricerca filter narrows by job type and tutti restores", async () => {
      await selectTipoLavoro(pipelinePage, E2E_PIPELINE.tipoLavoro.colf)
      await applyFilters(pipelinePage)

      const colfIds = Object.values(E2E_PIPELINE.processi)
        .filter((processo) => processo.tipoLavoro === E2E_PIPELINE.tipoLavoro.colf)
        .map((processo) => processo.id)
      const nonColfIds = Object.values(E2E_PIPELINE.processi)
        .filter((processo) => processo.tipoLavoro !== E2E_PIPELINE.tipoLavoro.colf)
        .map((processo) => processo.id)

      for (const processId of colfIds) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, true)
      }
      for (const processId of nonColfIds) {
        await expectE2eFixtureCardVisibility(pipelinePage, processId, false)
      }

      await selectAllTipoLavoro(pipelinePage)
      await applyFilters(pipelinePage, { waitForBoard: false })
      await expectVisibleE2eFixtureCount(pipelinePage, E2E_FIXTURE_CARD_COUNT)
    })

    test("chiamata filter splits booked-call cards", async () => {
      await setChiamataFilter(pipelinePage, "yes")
      await applyFilters(pipelinePage)
      await expectE2eFixtureCardVisibility(
        pipelinePage,
        E2E_PIPELINE.processi.bianchiWarm.id,
        true,
      )
      await expectE2eFixtureCardVisibility(pipelinePage, E2E_PIPELINE.processi.template.id, false)

      await setChiamataFilter(pipelinePage, "no")
      await applyFilters(pipelinePage)
      await expectE2eFixtureCardVisibility(
        pipelinePage,
        E2E_PIPELINE.processi.bianchiWarm.id,
        false,
      )
      await expectE2eFixtureCardVisibility(pipelinePage, E2E_PIPELINE.processi.template.id, true)
    })

    test("periodo ultimi 7 giorni excludes old seeded rows", async () => {
      await setPeriodoPreset(pipelinePage, "Ultimi 7 giorni")
      await applyFilters(pipelinePage)

      await expectE2eFixtureCardVisibility(
        pipelinePage,
        E2E_PIPELINE.processi.warmPreventivo.id,
        false,
      )
      await expectE2eFixtureCardVisibility(pipelinePage, E2E_PIPELINE.processi.template.id, true)

      await setPeriodoPreset(pipelinePage, "Da sempre")
      await applyFilters(pipelinePage)
      await resetFilters(pipelinePage)
      await expectVisibleE2eFixtureCount(pipelinePage, E2E_FIXTURE_CARD_COUNT)
    })

    test("custom creato da input switches periodo to da sempre", async () => {
      await setPeriodoPreset(pipelinePage, "Ultimi 7 giorni")
      await pipelinePage.getByLabel("Creato da").fill("2020-01-01T00:00")
      await applyFilters(pipelinePage)

      await expect(toolbarCombobox(pipelinePage, "Periodo")).toContainText("Da sempre")
    })

    test("reset filtri clears toolbar filters and search", async () => {
      await setPreventivoFilter(pipelinePage, "yes")
      await setSearchQuery(pipelinePage, "Bianchi")
      await applyFilters(pipelinePage)
      await expectVisibleE2eFixtureCount(pipelinePage, 0)

      await resetFilters(pipelinePage)
      await expectVisibleE2eFixtureCount(pipelinePage, E2E_FIXTURE_CARD_COUNT)
      await expect(pipelinePage.locator('[data-testid="pipeline-search-input"]')).toHaveValue("")
      await expect(toolbarCombobox(pipelinePage, "Preventivo")).toContainText("Tutti")
    })

    test("search with no matches shows empty columns", async () => {
      await setSearchQuery(pipelinePage, "zzzz-e2e-no-match")
      await applyFilters(pipelinePage)

      await expect(pipelinePage.getByText("Nessuna ricerca").first()).toBeVisible()
      await expectVisibleE2eFixtureCount(pipelinePage, 0)
    })
  })

  test.describe("persistence", () => {
    test.beforeEach(async ({ page }) => {
      await gotoPipeline(page)
      await clearPipelineFiltersStorage(page)
      await resetFilters(page)
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

      await reloadPipeline(page)

      await expect(toolbarCombobox(page, "Preventivo")).toContainText("Accettato")
      for (const processId of processIdsWithPreventivoAccettato()) {
        await expectE2eFixtureCardVisibility(page, processId, true)
      }
      await expect(page.locator('[data-testid="pipeline-search-input"]')).toHaveValue("")
    })
  })
})
