import { expect, test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_RICERCA, OPERATORS } from "../constants"
import {
  commentsSectionCount,
  commentsUnreadMentionDot,
  entitySectionId,
  expectCommentsPillVisible,
  openCommentsPanel,
  waitForCommentMarkRead,
} from "../support/commenti"
import {
  formatMentionBody,
  resetCommentiFixture,
  resolveOperatorIdByEmail,
  seedComment,
} from "../support/commenti-mutations"
import { gotoRicercaDetail } from "../support/ricerca"

const { unassignedNuova } = E2E_RICERCA.processi

test.describe("commenti: unread mentions", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("shows red indicators on the pill and section badge until the mention is read", async ({
    browser,
  }) => {
    const recruiterId = await resolveOperatorIdByEmail(OPERATORS.recruiter.email)
    expect(recruiterId).toBeTruthy()

    const body = formatMentionBody(
      "E2E Recruiter",
      recruiterId!,
      `${E2E_COMMENTI_BODY_PREFIX}unread mention ${Date.now()} `,
    )

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
      storageState: OPERATORS.recruiter.storageStatePath,
    })
    const page = await recruiterContext.newPage()

    try {
      await gotoRicercaDetail(page, unassignedNuova.id)
      await expectCommentsPillVisible(page)

      const unreadDot = commentsUnreadMentionDot(page)
      await expect(unreadDot).toBeVisible({ timeout: 30_000 })
      // Design-token red (bg-danger), not a missing Tailwind red-* utility.
      await expect(unreadDot).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)")

      // Register before opening: visible threads start the mark-read timer
      // immediately, so waiting after open can miss the RPC.
      const markRead = waitForCommentMarkRead(page)
      await openCommentsPanel(page)

      const ricercaSectionId = entitySectionId("ricerca", unassignedNuova.id)
      const sectionBadge = commentsSectionCount(page, ricercaSectionId)
      await expect(sectionBadge).toHaveAttribute("data-mention-highlighted", "true")

      // Composer renders `@Label`, not the raw `@[Label](uuid)` markup.
      const visibleBody = body.replace(
        /@\[([^\]]+)\]\([^)]+\)/g,
        "@$1",
      )
      const thread = page
        .locator('[data-testid^="comments-thread-"]')
        .filter({ hasText: visibleBody })
      await expect(thread).toBeVisible()
      await thread.scrollIntoViewIfNeeded()
      await markRead

      await expect(commentsUnreadMentionDot(page)).toHaveCount(0)
      await expect(sectionBadge).not.toHaveAttribute("data-mention-highlighted", "true")
    } finally {
      await recruiterContext.close()
    }
  })
})
