import { expect, test } from "@playwright/test"

import {
  E2E_COMMENTI_BODY_PREFIX,
  E2E_FAMIGLIA,
  E2E_LAVORATORI,
  E2E_RICERCA,
} from "../constants"
import {
  entitySectionId,
  expandCommentsSection,
  expectCommentBodyVisible,
  openRicercaPipelineWorker,
  sendComment,
} from "../support/commenti"
import { resetCommentiFixture, seedComment } from "../support/commenti-mutations"
import { getWorkerCard, gotoGate1 } from "../support/lavoratori"
import { gotoRicercaDetail } from "../support/ricerca"
import { ensureWorkerSelezione } from "../support/ricerca-mutations"

const { assignedToday, unassignedNuova } = E2E_RICERCA.processi
const { qualificatoMi } = E2E_LAVORATORI.lavoratori

test.describe("commenti: cross-surface propagation", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("gate 1 lavoratore comment appears on ricerca worker overlay", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}gate to ricerca ${Date.now()}`
    const selectionId = await ensureWorkerSelezione(assignedToday.id, qualificatoMi.id)

    await gotoGate1(page)
    await getWorkerCard(page, qualificatoMi.id).click()
    await sendComment(page, body)

    await gotoRicercaDetail(page, assignedToday.id)
    await openRicercaPipelineWorker(page, qualificatoMi.displayName)
    await expandCommentsSection(page, entitySectionId("lavoratore", qualificatoMi.id))
    await expectCommentBodyVisible(page, body)

    await expandCommentsSection(page, entitySectionId("candidatura", selectionId))
    await expect(page.locator('[data-testid="comments-body"]').filter({ hasText: body })).toHaveCount(
      0,
    )
  })

  test("famiglia comment is visible on ricerca famiglia section", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}famiglia propagation ${Date.now()}`
    await seedComment({
      pageEntityType: "famiglia",
      pageEntityId: E2E_FAMIGLIA.id,
      anchorEntityType: "famiglia",
      anchorEntityId: E2E_FAMIGLIA.id,
      body,
      sourceInterface: "kanban_famiglie",
    })

    await gotoRicercaDetail(page, unassignedNuova.id)
    await expandCommentsSection(page, entitySectionId("famiglia", E2E_FAMIGLIA.id))
    await expectCommentBodyVisible(page, body)
  })
})
