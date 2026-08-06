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
  openCommentsPanel,
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

  // BAZ-160: unselected ricerca must not aggregate pipeline worker comments into COLLEGATE.
  test("lavoratore comment stays out of ricerca COLLEGATE until worker is selected", async ({
    page,
  }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}ricerca no pipeline aggregate ${Date.now()}`
    await ensureWorkerSelezione(assignedToday.id, qualificatoMi.id)
    await seedComment({
      pageEntityType: "lavoratore",
      pageEntityId: qualificatoMi.id,
      anchorEntityType: "lavoratore",
      anchorEntityId: qualificatoMi.id,
      body,
      sourceInterface: "cerca_lavoratore",
    })

    await gotoRicercaDetail(page, assignedToday.id)
    await openCommentsPanel(page)
    await expandCommentsSection(page, "descendants")
    await expect(
      page.locator('[data-testid="comments-body"]').filter({ hasText: body }),
    ).toHaveCount(0)

    await openRicercaPipelineWorker(page, qualificatoMi.displayName)
    await expandCommentsSection(page, entitySectionId("lavoratore", qualificatoMi.id))
    await expectCommentBodyVisible(page, body)
  })

  // BAZ-160: a candidatura comment is scoped 1:1 to this ricerca, so (unlike a
  // worker-global lavoratore note) it MUST aggregate into COLLEGATE even with no
  // worker selected.
  test("candidatura comment aggregates into ricerca COLLEGATE without selecting the worker", async ({
    page,
  }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}ricerca candidatura aggregate ${Date.now()}`
    const selectionId = await ensureWorkerSelezione(assignedToday.id, qualificatoMi.id)
    await seedComment({
      pageEntityType: "candidatura",
      pageEntityId: selectionId,
      anchorEntityType: "candidatura",
      anchorEntityId: selectionId,
      body,
      sourceInterface: "dettaglio_lavoratore_ricerca",
    })

    await gotoRicercaDetail(page, assignedToday.id)
    await openCommentsPanel(page)
    await expandCommentsSection(page, "descendants")
    await expectCommentBodyVisible(page, body)
  })
})
