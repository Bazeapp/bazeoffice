import { expect, type Locator, type Page } from "@playwright/test"

const FLYOUT_TIMEOUT_MS = 30_000

export function notificheSidebarTrigger(page: Page) {
  return page.locator('[data-testid="notifiche-sidebar-trigger"]')
}

export function notificheUnreadBadge(page: Page) {
  return page.locator('[data-testid="notifiche-unread-badge"]')
}

export function notificheCollapsedDot(page: Page) {
  return page.locator('[data-testid="notifiche-collapsed-dot"]')
}

export function notificheFlyout(page: Page) {
  return page.locator('[data-testid="notifiche-flyout"]')
}

export function notificheMarkAllRead(page: Page) {
  return page.locator('[data-testid="notifiche-mark-all-read"]')
}

export function notificheTab(page: Page, tab: "da-risolvere" | "tutte" | "risolte") {
  return page.locator(`[data-testid="notifiche-tab-${tab}"]`)
}

export function notificheRows(page: Page) {
  return page.locator('[data-testid="notifiche-row"]')
}

export function notificheRowByText(page: Page, text: string | RegExp) {
  return notificheRows(page).filter({ hasText: text })
}

export function visibleMentionBody(body: string) {
  return body.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
}

export async function openNotificheFlyout(page: Page) {
  await expect(notificheSidebarTrigger(page)).toBeVisible({
    timeout: FLYOUT_TIMEOUT_MS,
  })
  if (await notificheFlyout(page).isVisible()) {
    return
  }
  await notificheSidebarTrigger(page).click()
  await expect(notificheFlyout(page)).toBeVisible({ timeout: FLYOUT_TIMEOUT_MS })
}

export async function selectNotificheTab(
  page: Page,
  tab: "da-risolvere" | "tutte" | "risolte",
) {
  await openNotificheFlyout(page)
  await notificheTab(page, tab).click()
  await expect(notificheTab(page, tab)).toHaveAttribute("data-state", "active")
}

export async function expectNotificaRowStatus(
  row: Locator,
  status: "non_letta" | "letta" | "risolta",
) {
  await expect(row).toBeVisible({ timeout: FLYOUT_TIMEOUT_MS })
  await expect(row).toHaveAttribute("data-status", status)
}

export async function resolveNotificaRow(page: Page, row: Locator) {
  await row.hover()
  const resolveButton = row.locator('[data-testid="notifiche-resolve"]')
  const resolveResponse = waitForNotificaRpc(page, "notifiche_resolve")
  await resolveButton.click({ force: true })
  await resolveResponse
}

export async function reopenNotificaRow(page: Page, row: Locator) {
  await row.hover()
  const reopenButton = row.locator('[data-testid="notifiche-reopen"]')
  const reopenResponse = waitForNotificaRpc(page, "notifiche_reopen")
  await reopenButton.click({ force: true })
  await reopenResponse
}

export function waitForNotificaRpc(
  page: Page,
  rpc:
    | "notifiche_mark_read"
    | "notifiche_mark_all_read"
    | "notifiche_resolve"
    | "notifiche_reopen"
    | "notifiche_list"
    | "notifiche_counts",
) {
  return page.waitForResponse(
    (response) =>
      response.url().includes(`/rest/v1/rpc/${rpc}`) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: FLYOUT_TIMEOUT_MS },
  )
}

export async function markAllNotificheRead(page: Page) {
  await openNotificheFlyout(page)
  const button = notificheMarkAllRead(page)
  await expect(button).toBeVisible({ timeout: FLYOUT_TIMEOUT_MS })
  const markAllResponse = waitForNotificaRpc(page, "notifiche_mark_all_read")
  await button.click()
  await markAllResponse
}
