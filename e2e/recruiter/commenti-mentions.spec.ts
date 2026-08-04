import { expect, test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_RICERCA, OPERATORS } from "../constants"
import {
  commentsComposerInput,
  commentsComposerSubmit,
  expectCommentBodyVisible,
  openCommentsPanel,
  sendComment,
  waitForCommentCreate,
} from "../support/commenti"
import { resetCommentiFixture, resolveOperatorIdByEmail } from "../support/commenti-mutations"
import { gotoRicercaDetail } from "../support/ricerca"
import { interceptRpc } from "../support/route-errors"

const { unassignedNuova } = E2E_RICERCA.processi

test.describe("commenti: mentions", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("stores and renders an @-mention after reload", async ({ page }) => {
    const customerId = await resolveOperatorIdByEmail(OPERATORS.customer.email)
    expect(customerId).toBeTruthy()

    await gotoRicercaDetail(page, unassignedNuova.id)
    await openCommentsPanel(page)

    const input = commentsComposerInput(page)
    await input.click()
    await input.pressSequentially("Ciao @E2E")
    await expect(page.locator('[data-testid="comments-mention-autocomplete"]')).toBeVisible({
      timeout: 10_000,
    })
    await page.locator(`[data-testid="comments-mention-option-${customerId}"]`).click()

    const createResponse = waitForCommentCreate(page)
    await commentsComposerSubmit(page).click()
    await createResponse

    await expect(page.locator('[data-testid="comments-mention-highlight"]')).toBeVisible()
    await page.reload()
    await gotoRicercaDetail(page, unassignedNuova.id)
    await openCommentsPanel(page)
    await expect(page.locator('[data-testid="comments-mention-highlight"]')).toBeVisible()
  })
})

test.describe("commenti: send errors", () => {
  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("rolls back optimistic comment and shows toast on create failure", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}error ${Date.now()}`
    await gotoRicercaDetail(page, unassignedNuova.id)
    await openCommentsPanel(page)
    await interceptRpc(page, "commenti_create", 500)

    const input = commentsComposerInput(page)
    await input.click()
    await input.fill(body)
    await commentsComposerSubmit(page).click()

    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /commento|errore|invio/i }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="comments-body"]').filter({ hasText: body })).toHaveCount(
      0,
    )

    await page.unrouteAll()
    await sendComment(page, `${body} retry`)
    await expectCommentBodyVisible(page, `${body} retry`)
  })
})
