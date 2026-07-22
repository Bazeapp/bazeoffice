import { expect, test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_FAMIGLIA, E2E_LAVORATORI, E2E_RICERCA } from "../constants"
import {
  closeCommentsPanel,
  commentsPanel,
  commentsPill,
  commentsSectionToggle,
  commentsTargetChip,
  entitySectionId,
  expandCommentsSection,
  openCommentsPanel,
  sendComment,
  waitForCommentCount,
} from "../support/commenti"
import { resetCommentiFixture, seedComment } from "../support/commenti-mutations"
import {
  getWorkerCard,
  gotoCercaLavoratori,
  gotoGate1,
  openWorkerDetail,
} from "../support/lavoratori"
import { gotoRicercaDetail } from "../support/ricerca"
import { deleteWorkerSelezione, ensureWorkerSelezione } from "../support/ricerca-mutations"

const { unassignedNuova, assignedToday } = E2E_RICERCA.processi
const { qualificatoMi } = E2E_LAVORATORI.lavoratori

test.describe("commenti: panel shell", () => {
  test.describe.configure({ timeout: 90_000 })

  test.beforeEach(async () => {
    await resetCommentiFixture()
  })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("collapsed pill shows count; expand opens panel with section list", async ({ page }) => {
    const countResponse = waitForCommentCount(page)
    await gotoRicercaDetail(page, unassignedNuova.id)
    await countResponse

    await expect(commentsPill(page)).toBeVisible({ timeout: 30_000 })
    // Collapsed: shell stays closed. Section list may still prefetch when any
    // section count > 0 (unread-mention detection on the pill).
    await expect(commentsPanel(page)).toHaveCount(0)

    await commentsPill(page).click()
    await expect(commentsPanel(page)).toBeVisible({ timeout: 30_000 })
    await expect(commentsTargetChip(page)).toBeVisible({ timeout: 30_000 })

    await closeCommentsPanel(page)
    await expect(commentsPanel(page)).toHaveCount(0)
  })

  test("author menu exposes edit but not delete", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}menu probe ${Date.now()}`
    await gotoRicercaDetail(page, unassignedNuova.id)
    await sendComment(page, body)

    const thread = page.locator('[data-testid^="comments-thread-"]').filter({ hasText: body })
    await thread.hover()
    await thread.locator('[data-testid^="comments-menu-"]').click()
    await expect(page.locator('[data-testid^="comments-edit-"]')).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Elimina" })).toHaveCount(0)
  })
})

test.describe("commenti: read state", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("marks another author's comment as read after it stays in view", async ({ browser }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}read probe ${Date.now()}`
    await seedComment({
      role: "customer",
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      body,
      sourceInterface: "dettaglio_ricerca",
    })

    const recruiterContext = await browser.newContext({
      storageState: "e2e/.auth/recruiter.json",
    })
    const page = await recruiterContext.newPage()

    try {
      await gotoRicercaDetail(page, unassignedNuova.id)
      const markRead = waitForCommentMarkReadFromPage(page)
      await openCommentsPanel(page)
      const thread = page.locator('[data-testid^="comments-thread-"]').filter({ hasText: body })
      await thread.scrollIntoViewIfNeeded()
      await markRead
      await expect(thread.getByLabel("Non letto")).toHaveCount(0)
    } finally {
      await recruiterContext.close()
    }
  })
})

function waitForCommentMarkReadFromPage(page: import("@playwright/test").Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/rpc/commenti_mark_read") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 15_000 },
  )
}

test.describe("commenti: sections and gate phase notes", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("ricerca focus shows ricerca and famiglia sections", async ({ page }) => {
    await gotoRicercaDetail(page, unassignedNuova.id)
    await openCommentsPanel(page)

    await expect(
      commentsSectionToggle(page, entitySectionId("ricerca", unassignedNuova.id)),
    ).toBeVisible()
    await expect(
      commentsSectionToggle(page, entitySectionId("famiglia", E2E_FAMIGLIA.id)),
    ).toBeVisible()
    await expect(
      commentsSectionToggle(page, entitySectionId("candidatura", assignedToday.id)),
    ).toHaveCount(0)
  })

  test("expanding famiglia section moves the target chip", async ({ page }) => {
    await gotoRicercaDetail(page, unassignedNuova.id)
    await openCommentsPanel(page)
    await expandCommentsSection(page, entitySectionId("famiglia", E2E_FAMIGLIA.id))
    await expect(commentsTargetChip(page)).toContainText(/Famiglia/i)
  })

  test("gate 1 write creates a pinned phase note on lavoratore", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}gate phase ${Date.now()}`
    const newerBody = `${E2E_COMMENTI_BODY_PREFIX}gate newer free ${Date.now()}`

    await seedComment({
      pageEntityType: "lavoratore",
      pageEntityId: qualificatoMi.id,
      anchorEntityType: "lavoratore",
      anchorEntityId: qualificatoMi.id,
      body: newerBody,
      sourceInterface: "cerca_lavoratore",
    })

    await gotoGate1(page)
    await getWorkerCard(page, qualificatoMi.id).click()
    await sendComment(page, body)

    await expandCommentsSection(page, entitySectionId("lavoratore", qualificatoMi.id))
    await expect(page.locator('[data-testid="comments-phase-badge"]')).toBeVisible()
    const roots = page.locator('[data-testid^="comments-root-"]')
    await expect(roots.first()).toContainText(/GATE 1/i)
  })
})

test.describe("commenti: candidatura focus sections", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
    await deleteWorkerSelezione(assignedToday.id, qualificatoMi.id)
  })

  test("worker pipeline overlay exposes candidatura, lavoratore, ricerca, and famiglia sections", async ({
    page,
  }) => {
    const selectionId = await ensureWorkerSelezione(assignedToday.id, qualificatoMi.id)
    await gotoRicercaDetail(page, assignedToday.id)
    await page.getByText(qualificatoMi.displayName, { exact: true }).first().click()
    await openCommentsPanel(page)

    await expect(
      commentsSectionToggle(page, entitySectionId("candidatura", selectionId)),
    ).toBeVisible()
    await expect(
      commentsSectionToggle(page, entitySectionId("lavoratore", qualificatoMi.id)),
    ).toBeVisible()
    await expect(
      commentsSectionToggle(page, entitySectionId("ricerca", assignedToday.id)),
    ).toBeVisible()
    await expect(
      commentsSectionToggle(page, entitySectionId("famiglia", E2E_FAMIGLIA.id)),
    ).toBeVisible()
  })
})

test.describe("commenti: cerca lavoratore send", () => {
  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("sends a comment on lavoratore focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}lavoratore ${Date.now()}`
    await gotoCercaLavoratori(page)
    await openWorkerDetail(page, qualificatoMi.id)
    await sendComment(page, body)
    await expectCommentBodyOnPage(page, body)

    await page.reload()
    await openWorkerDetail(page, qualificatoMi.id)
    await openCommentsPanel(page)
    await expectCommentBodyOnPage(page, body)
  })
})

async function expectCommentBodyOnPage(page: import("@playwright/test").Page, body: string) {
  await expect(page.locator('[data-testid="comments-body"]').filter({ hasText: body })).toBeVisible({
    timeout: 30_000,
  })
}
