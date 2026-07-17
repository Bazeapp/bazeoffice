import { expect, type Page } from "@playwright/test"

const PANEL_TIMEOUT_MS = 30_000

export function commentsPill(page: Page) {
  return page.locator('[data-testid="comments-pill"]')
}

export function commentsUnreadMentionDot(page: Page) {
  return page.locator('[data-testid="comments-unread-mention-dot"]')
}

export function commentsSectionCount(page: Page, sectionId: string) {
  return commentsSectionToggle(page, sectionId).locator('[data-testid="comments-section-count"]')
}

export function commentsPanel(page: Page) {
  return page.locator('[data-testid="comments-panel"]')
}

export function commentsComposerInput(page: Page) {
  return page.locator('[data-testid="comments-composer-input"]')
}

export function commentsComposerSubmit(page: Page) {
  return page.locator('[data-testid="comments-composer-submit"]')
}

export function commentsTargetChip(page: Page) {
  return page.locator('[data-testid="comments-target-chip"]')
}

export function commentsSection(page: Page, sectionId: string) {
  return page.locator(`[data-testid="comments-section-${sectionId}"]`)
}

export function commentsSectionToggle(page: Page, sectionId: string) {
  return page.locator(`[data-testid="comments-section-toggle-${sectionId}"]`)
}

export function entitySectionId(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`
}

export async function expectCommentsPillVisible(page: Page) {
  await expect(commentsPill(page)).toBeVisible({ timeout: PANEL_TIMEOUT_MS })
}

export async function openCommentsPanel(page: Page) {
  const pill = commentsPill(page)
  await expect(pill).toBeVisible({ timeout: PANEL_TIMEOUT_MS })
  if (await commentsPanel(page).isVisible()) {
    return
  }
  await pill.click()
  await expect(commentsPanel(page)).toBeVisible({ timeout: PANEL_TIMEOUT_MS })
}

export async function closeCommentsPanel(page: Page) {
  const closeButton = page.locator('[data-testid="comments-panel-close"]')
  if (await closeButton.isVisible()) {
    await closeButton.click()
    await expect(commentsPanel(page)).toHaveCount(0)
  }
}

export async function expandCommentsSection(page: Page, sectionId: string) {
  await openCommentsPanel(page)
  const toggle = commentsSectionToggle(page, sectionId)
  await expect(toggle).toBeVisible({ timeout: PANEL_TIMEOUT_MS })
  const sectionRoot = commentsSection(page, sectionId)
  if (!(await sectionRoot.isVisible())) {
    await toggle.click()
  }
  await expect(sectionRoot).toBeVisible({ timeout: PANEL_TIMEOUT_MS })
}

export async function selectCommentTarget(page: Page, entityType: string) {
  await commentsTargetChip(page).click()
  await page.locator(`[data-testid="comments-target-option-${entityType}"]`).click()
}

export function waitForCommentCreate(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/rpc/commenti_create") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: PANEL_TIMEOUT_MS },
  )
}

export function waitForCommentMarkRead(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/rpc/commenti_mark_read") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: PANEL_TIMEOUT_MS },
  )
}

export function waitForCommentCount(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/rpc/commenti_count_for_page") &&
      response.request().method() === "POST",
    { timeout: PANEL_TIMEOUT_MS },
  )
}

export function waitForCommentSectionList(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/rpc/commenti_list_section") &&
      response.request().method() === "POST",
    { timeout: PANEL_TIMEOUT_MS },
  )
}

export async function sendComment(page: Page, body: string) {
  await openCommentsPanel(page)
  const input = commentsComposerInput(page)
  await input.click()
  await input.fill(body)
  const createResponse = waitForCommentCreate(page)
  await commentsComposerSubmit(page).click()
  await createResponse
}

export async function expectCommentBodyVisible(page: Page, body: string) {
  await expect(page.locator('[data-testid="comments-body"]').filter({ hasText: body })).toBeVisible({
    timeout: PANEL_TIMEOUT_MS,
  })
}

export async function openRicercaPipelineWorker(page: Page, workerDisplayName: string) {
  await page.getByText(workerDisplayName, { exact: true }).first().click()
  await expectCommentsPillVisible(page)
}
