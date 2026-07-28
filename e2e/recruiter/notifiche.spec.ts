import { expect, test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_RICERCA } from "../constants"
import {
  commentsPanel,
  expectCommentBodyVisible,
} from "../support/commenti"
import { seedReply } from "../support/commenti-mutations"
import {
  expectNotificaRowStatus,
  markAllNotificheRead,
  notificheMarkAllRead,
  notificheRowByText,
  notificheSidebarTrigger,
  notificheUnreadBadge,
  openNotificheFlyout,
  reopenNotificaRow,
  resolveNotificaRow,
  selectNotificheTab,
  visibleMentionBody,
  waitForNotificaRpc,
} from "../support/notifiche"
import {
  fetchNotificaByCommentId,
  resetNotificheFixture,
  seedMentionNotifica,
  seedThreadReplyNotifica,
} from "../support/notifiche-mutations"
import { selectors } from "../support/selectors"

const { unassignedNuova } = E2E_RICERCA.processi

test.describe("notifiche: mention, links, read and resolution", () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async () => {
    await resetNotificheFixture()
  })

  test.afterEach(async () => {
    await resetNotificheFixture()
  })

  test("shows an unread mention notification with sidebar badge", async ({ page }) => {
    const token = `mention-unread-${Date.now()}`
    const { body } = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: token,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })

    await page.goto(selectors.routes.ricerca)
    await expect(notificheSidebarTrigger(page)).toBeVisible({ timeout: 30_000 })
    await expect(notificheUnreadBadge(page)).toBeVisible({ timeout: 30_000 })
    await expect(notificheUnreadBadge(page)).toHaveText("1")

    await openNotificheFlyout(page)
    const row = notificheRowByText(page, visibleMentionBody(body))
    await expectNotificaRowStatus(row, "non_letta")
    await expect(row).toContainText("ti ha menzionato")
    await expect(row).toContainText("RICERCA")
  })

  test("clicking a notification marks it read and opens the linked comment", async ({
    page,
  }) => {
    const token = `mention-link-${Date.now()}`
    const { body, notifica } = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: token,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })
    const visibleBody = visibleMentionBody(body)

    await page.goto(selectors.routes.ricerca)
    await openNotificheFlyout(page)

    const row = notificheRowByText(page, visibleBody)
    await expectNotificaRowStatus(row, "non_letta")

    const markRead = waitForNotificaRpc(page, "notifiche_mark_read")
    await row.click()
    await markRead

    await expect(page).toHaveURL(
      new RegExp(`/ricerca/${unassignedNuova.id}(?:\\?|$)`),
      { timeout: 30_000 },
    )
    await expect(commentsPanel(page)).toBeVisible({ timeout: 30_000 })
    await expectCommentBodyVisible(page, visibleBody)

    await expect
      .poll(async () => {
        const current = await fetchNotificaByCommentId(notifica.comment_id, {
          userId: notifica.user_id,
        })
        return current?.status ?? null
      })
      .toBe("letta")

    await openNotificheFlyout(page)
    await expectNotificaRowStatus(notificheRowByText(page, visibleBody), "letta")
    await expect(notificheUnreadBadge(page)).toHaveCount(0)
    await expect(notificheMarkAllRead(page)).toHaveCount(0)
  })

  test("marks all notifications as read from the flyout action", async ({ page }) => {
    const tokenA = `mention-all-a-${Date.now()}`
    const tokenB = `mention-all-b-${Date.now()}`

    const first = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: tokenA,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })
    const second = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: tokenB,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })

    await page.goto(selectors.routes.ricerca)
    await expect(notificheUnreadBadge(page)).toHaveText("2", { timeout: 30_000 })

    await markAllNotificheRead(page)

    await expect(notificheUnreadBadge(page)).toHaveCount(0)
    await expect(notificheMarkAllRead(page)).toHaveCount(0)

    const firstVisible = visibleMentionBody(first.body)
    const secondVisible = visibleMentionBody(second.body)
    await expectNotificaRowStatus(notificheRowByText(page, firstVisible), "letta")
    await expectNotificaRowStatus(notificheRowByText(page, secondVisible), "letta")
  })

  test("resolves and reopens a notification across tabs", async ({ page }) => {
    const token = `mention-resolve-${Date.now()}`
    const { body } = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: token,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })
    const visibleBody = visibleMentionBody(body)

    await page.goto(selectors.routes.ricerca)
    await openNotificheFlyout(page)

    const openRow = notificheRowByText(page, visibleBody)
    await expectNotificaRowStatus(openRow, "non_letta")
    await resolveNotificaRow(page, openRow)

    await expect(notificheRowByText(page, visibleBody)).toHaveCount(0)
    await expect(page.locator('[data-testid="notifiche-empty-da-risolvere"]')).toBeVisible()

    await selectNotificheTab(page, "risolte")
    const resolvedRow = notificheRowByText(page, visibleBody)
    await expectNotificaRowStatus(resolvedRow, "risolta")
    await expect(resolvedRow).toContainText("Risolta")

    await reopenNotificaRow(page, resolvedRow)
    await expect(notificheRowByText(page, visibleBody)).toHaveCount(0)

    // Riapri clears resolved_at but keeps read_at → lands as letta (not non_letta).
    await selectNotificheTab(page, "da-risolvere")
    const reopenedRow = notificheRowByText(page, visibleBody)
    await expectNotificaRowStatus(reopenedRow, "letta")
  })

  test("creates a thread-reply notification for the thread owner", async ({ page }) => {
    const token = `thread-reply-${Date.now()}`
    const { replyBody } = await seedThreadReplyNotifica({
      threadOwnerRole: "recruiter",
      replyAuthorRole: "customer",
      bodyToken: token,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })

    await page.goto(selectors.routes.ricerca)
    await openNotificheFlyout(page)

    const row = notificheRowByText(page, replyBody)
    await expectNotificaRowStatus(row, "non_letta")
    await expect(row).toContainText("ha risposto nel tuo thread")
  })

  test("replying in the thread auto-resolves open notifications", async ({ page }) => {
    const token = `mention-auto-resolve-${Date.now()}`
    const { body, notifica, comment } = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: token,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })
    const visibleBody = visibleMentionBody(body)

    await seedReply({
      role: "recruiter",
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      threadRootId: comment.id,
      body: `${E2E_COMMENTI_BODY_PREFIX}${token} auto-resolve reply`,
    })

    await expect
      .poll(async () => {
        const current = await fetchNotificaByCommentId(notifica.comment_id, {
          userId: notifica.user_id,
        })
        return current?.status ?? null
      })
      .toBe("risolta")

    await page.goto(selectors.routes.ricerca)
    await openNotificheFlyout(page)
    await expect(notificheRowByText(page, visibleBody)).toHaveCount(0)
    await expect(notificheUnreadBadge(page)).toHaveCount(0)

    await selectNotificheTab(page, "risolte")
    await expectNotificaRowStatus(notificheRowByText(page, visibleBody), "risolta")
  })

  test("Tutte tab lists both open and resolved notifications", async ({ page }) => {
    const openToken = `mention-tutte-open-${Date.now()}`
    const resolvedToken = `mention-tutte-resolved-${Date.now()}`

    const open = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: openToken,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })
    const resolved = await seedMentionNotifica({
      recipientRole: "recruiter",
      recipientLabel: "E2E Recruiter",
      actorRole: "customer",
      bodyToken: resolvedToken,
      pageEntityType: "ricerca",
      pageEntityId: unassignedNuova.id,
      anchorEntityType: "ricerca",
      anchorEntityId: unassignedNuova.id,
      sourceInterface: "dettaglio_ricerca",
    })

    await page.goto(selectors.routes.ricerca)
    await openNotificheFlyout(page)
    await resolveNotificaRow(
      page,
      notificheRowByText(page, visibleMentionBody(resolved.body)),
    )

    await selectNotificheTab(page, "tutte")
    await expectNotificaRowStatus(
      notificheRowByText(page, visibleMentionBody(open.body)),
      "non_letta",
    )
    await expectNotificaRowStatus(
      notificheRowByText(page, visibleMentionBody(resolved.body)),
      "risolta",
    )
  })
})
