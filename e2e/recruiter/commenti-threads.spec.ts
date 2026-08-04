import { expect, test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_LAVORATORI } from "../constants"
import {
  entitySectionId,
  expandCommentsSection,
  openCommentsPanel,
} from "../support/commenti"
import { resetCommentiFixture, seedComment, seedReply } from "../support/commenti-mutations"
import { gotoCercaLavoratori, openWorkerDetail } from "../support/lavoratori"

const { qualificatoMi } = E2E_LAVORATORI.lavoratori

test.describe("commenti: threads and pagination", () => {
  test.describe.configure({ timeout: 120_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("collapses long reply threads behind a show-more toggle", async ({ page }) => {
    const rootBody = `${E2E_COMMENTI_BODY_PREFIX}thread root ${Date.now()}`
    const root = await seedComment({
      pageEntityType: "lavoratore",
      pageEntityId: qualificatoMi.id,
      anchorEntityType: "lavoratore",
      anchorEntityId: qualificatoMi.id,
      body: rootBody,
      sourceInterface: "cerca_lavoratore",
    })

    for (let index = 1; index <= 4; index += 1) {
      await seedReply({
        pageEntityType: "lavoratore",
        pageEntityId: qualificatoMi.id,
        threadRootId: root.id,
        body: `${E2E_COMMENTI_BODY_PREFIX}reply ${index} ${Date.now()}`,
      })
    }

    await gotoCercaLavoratori(page)
    await openWorkerDetail(page, qualificatoMi.id)
    await expandCommentsSection(page, entitySectionId("lavoratore", qualificatoMi.id))

    const toggle = page.locator(`[data-testid="comments-show-replies-${root.id}"]`)
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(page.locator('[data-testid^="comments-thread-"]').filter({ hasText: /reply 4/ })).toBeVisible()
  })

  test("shows load more when a section has more than 20 root comments", async ({ page }) => {
    const sectionId = entitySectionId("lavoratore", qualificatoMi.id)
    for (let index = 0; index < 21; index += 1) {
      await seedComment({
        pageEntityType: "lavoratore",
        pageEntityId: qualificatoMi.id,
        anchorEntityType: "lavoratore",
        anchorEntityId: qualificatoMi.id,
        body: `${E2E_COMMENTI_BODY_PREFIX}paginate ${index} ${Date.now()}`,
        sourceInterface: "cerca_lavoratore",
      })
    }

    await gotoCercaLavoratori(page)
    await openWorkerDetail(page, qualificatoMi.id)
    await openCommentsPanel(page)
    await expandCommentsSection(page, sectionId)
    await expect(page.locator('[data-testid="comments-load-more"]')).toBeVisible()
  })
})
