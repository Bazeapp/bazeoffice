import { expect, test, type Page } from "@playwright/test"

import {
  E2E_CEDOLINI_BULK,
  E2E_CEDOLINI_BULK_WARNING_CATEGORIES,
} from "../constants"
import {
  gotoCedoliniControlli,
  switchToControlliTab,
} from "../support/cedolini"
import {
  deleteCheckRunsForMonth,
  readLatestCheckResultForMese,
  resetCedoliniBulkFixture,
} from "../support/cedolini-bulk-mutations"

const BOARD_LOAD_TIMEOUT_MS = 30_000
const LIVE_WORKER_TIMEOUT_MS = 180_000

async function expectCardOnlyInPronti(page: Page, resultId: string) {
  const pronti = page.getByTestId("cedolini-controlli-pronti")
  const warning = page.getByTestId("cedolini-controlli-warning")
  await expect(pronti.getByTestId(`cedolini-check-card-${resultId}`)).toBeVisible({
    timeout: BOARD_LOAD_TIMEOUT_MS,
  })
  await expect(warning.getByTestId(`cedolini-check-card-${resultId}`)).toHaveCount(0)
}

async function expectMeseHasNoWarnings(meseLavorativoId: string) {
  await expect
    .poll(
      async () => {
        const result = await readLatestCheckResultForMese(meseLavorativoId)
        if (!result) return "missing"
        if (result.status !== "ok") return `status=${result.status}`
        if (result.warnings.length > 0) return `warnings=${result.warnings.length}`
        return "ok"
      },
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )
    .toBe("ok")
}

test.describe("cedolini: controlli analysis", () => {
  test.describe.configure({ mode: "serial", timeout: LIVE_WORKER_TIMEOUT_MS })

  let controlliPage: Page
  const {
    prontoCandidate,
    eventiPresenze,
    chiusuraExcluded,
  } = E2E_CEDOLINI_BULK.controlli
  const {
    ok,
    oreMismatch: oreResultId,
    eventi,
    pdfUrl,
    pagaOraria,
    pagamentoStripe,
    noteCasiParticolari,
  } = E2E_CEDOLINI_BULK.checkResults

  test.beforeAll(async ({ browser }) => {
    controlliPage = await browser.newPage()
    await gotoCedoliniControlli(controlliPage)
  })

  test.afterAll(async () => {
    await resetCedoliniBulkFixture()
    await controlliPage.close()
  })

  test.afterEach(async () => {
    await resetCedoliniBulkFixture()
    await controlliPage.reload()
    await switchToControlliTab(controlliPage)
  })

  test("correct values land in Pronti with zero warnings", async () => {
    // f614: matching 24h PDF + 24h presenze + paga 9.5 + no caso + no Stripe signal.
    await expectMeseHasNoWarnings(prontoCandidate.id)
    await expectCardOnlyInPronti(controlliPage, ok)

    for (const category of E2E_CEDOLINI_BULK_WARNING_CATEGORIES) {
      await expect(
        controlliPage
          .getByTestId(`cedolini-controlli-group-${category}`)
          .getByTestId(`cedolini-check-card-${ok}`),
      ).toHaveCount(0)
    }
  })

  test("pre-seeded run shows Pronti and every data-driven warning group", async () => {
    await expect(controlliPage.getByTestId(`cedolini-check-card-${ok}`)).toBeVisible({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })

    for (const resultId of [
      oreResultId,
      eventi,
      pdfUrl,
      pagaOraria,
      pagamentoStripe,
      noteCasiParticolari,
    ]) {
      await expect(controlliPage.getByTestId(`cedolini-check-card-${resultId}`)).toBeVisible()
    }

    for (const category of E2E_CEDOLINI_BULK_WARNING_CATEGORIES) {
      await expect(
        controlliPage.getByTestId(`cedolini-controlli-group-${category}`),
      ).toBeVisible()
      await expect(
        controlliPage.getByTestId(`cedolini-controlli-category-${category}`),
      ).toBeVisible()
    }
  })

  test("warning category chips toggle group visibility", async () => {
    const oreChip = controlliPage.getByTestId(
      `cedolini-controlli-category-${E2E_CEDOLINI_BULK.warningCategories.oreNonCoerenti}`,
    )
    await expect(oreChip).toBeVisible()

    const oreGroup = controlliPage.getByTestId(
      `cedolini-controlli-group-${E2E_CEDOLINI_BULK.warningCategories.oreNonCoerenti}`,
    )
    await expect(oreGroup).toBeVisible()

    await oreChip.click()
    await expect(oreGroup).toHaveCount(0)

    await oreChip.click()
    await expect(oreGroup).toBeVisible()
  })

  test("chiusura rapporto row is excluded from Controlli results", async () => {
    await expect(
      controlliPage.getByTestId(`cedolini-check-card-${chiusuraExcluded.id}`),
    ).toHaveCount(0)
  })

  test("AE1: reload keeps persisted check results visible", async () => {
    // Pre-seeded run is already `completata` — progress bar only shows while
    // `in_corso`. Persistence is proven by cards surviving a full reload.
    await expect(controlliPage.getByTestId(`cedolini-check-card-${ok}`)).toBeVisible({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    await expect(controlliPage.getByTestId(`cedolini-check-card-${oreResultId}`)).toBeVisible()

    await controlliPage.reload()
    await switchToControlliTab(controlliPage)

    await expect(controlliPage.getByTestId(`cedolini-check-card-${ok}`)).toBeVisible({
      timeout: BOARD_LOAD_TIMEOUT_MS,
    })
    await expect(controlliPage.getByTestId(`cedolini-check-card-${oreResultId}`)).toBeVisible()
    for (const category of E2E_CEDOLINI_BULK_WARNING_CATEGORIES) {
      await expect(
        controlliPage.getByTestId(`cedolini-controlli-group-${category}`),
      ).toBeVisible()
    }
  })

  test("AE5: eventi presenze fixture appears under Eventi presenze group", async () => {
    // Group testid is on CollapsibleTrigger; cards live in sibling CollapsibleContent.
    const eventiGroup = controlliPage.getByTestId(
      `cedolini-controlli-group-${E2E_CEDOLINI_BULK.warningCategories.eventiPresenze}`,
    )
    await expect(eventiGroup).toBeVisible()
    await expect(eventiGroup).toContainText("(1)")
    await expect(controlliPage.getByTestId(`cedolini-check-card-${eventi}`)).toBeVisible()
    await expect(
      controlliPage
        .getByTestId(`cedolini-check-card-${eventi}`)
        .getByText(eventiPresenze.lavoratoreSearchText, { exact: false }),
    ).toBeVisible()
  })

  test("live worker: avvia analisi classifies Pronti and all data-driven warnings", async () => {
    test.setTimeout(LIVE_WORKER_TIMEOUT_MS)

    await deleteCheckRunsForMonth(E2E_CEDOLINI_BULK.checkRun.yearMonth)
    await controlliPage.reload()
    await switchToControlliTab(controlliPage)

    const startResponse = controlliPage.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/cedolini-check-start") &&
        response.request().method() === "POST",
      { timeout: BOARD_LOAD_TIMEOUT_MS },
    )

    await controlliPage.getByTestId("cedolini-controlli-avvia").click()
    await startResponse

    // Progress UI only renders while status is `in_corso` — once the run is
    // `completata` the bar disappears. Wait on persisted results instead.
    await expect
      .poll(
        async () => {
          const result = await readLatestCheckResultForMese(prontoCandidate.id)
          if (!result) return "missing"
          if (result.status !== "ok") return `status=${result.status}`
          if (result.warnings.length > 0) {
            return `warnings=${JSON.stringify(result.warnings)}`
          }
          return "ok"
        },
        { timeout: LIVE_WORKER_TIMEOUT_MS },
      )
      .toBe("ok")

    const liveOk = await readLatestCheckResultForMese(prontoCandidate.id)
    expect(liveOk).not.toBeNull()
    await expectCardOnlyInPronti(controlliPage, liveOk!.id)

    await expect(
      controlliPage.getByTestId(`cedolini-check-card-${chiusuraExcluded.id}`),
    ).toHaveCount(0)

    // Live worker must surface every data-driven warning bucket from seed rows.
    for (const category of E2E_CEDOLINI_BULK_WARNING_CATEGORIES) {
      await expect(
        controlliPage.getByTestId(`cedolini-controlli-group-${category}`),
      ).toBeVisible({ timeout: BOARD_LOAD_TIMEOUT_MS })
      await expect(
        controlliPage
          .getByTestId(`cedolini-controlli-group-${category}`)
          .getByTestId(`cedolini-check-card-${liveOk!.id}`),
      ).toHaveCount(0)
    }
  })
})
