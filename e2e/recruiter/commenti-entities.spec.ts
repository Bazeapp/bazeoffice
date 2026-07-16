import { test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_RICERCA } from "../constants"
import { expectCommentBodyVisible, sendComment } from "../support/commenti"
import { resetCommentiFixture } from "../support/commenti-mutations"
import { gotoRicercaDetail } from "../support/ricerca"

const { unassignedNuova } = E2E_RICERCA.processi

test.describe("commenti: recruiter entity send", () => {
  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("sends on ricerca focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}ricerca ${Date.now()}`
    await gotoRicercaDetail(page, unassignedNuova.id)
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })
})
