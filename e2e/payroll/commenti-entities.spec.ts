import { test } from "@playwright/test"

import { E2E_CEDOLINI, E2E_COMMENTI_BODY_PREFIX } from "../constants"
import { expectCommentBodyVisible, sendComment } from "../support/commenti"
import { resetCommentiFixture } from "../support/commenti-mutations"
import { gotoCedolini, openCardSheet } from "../support/cedolini"

const { todo } = E2E_CEDOLINI.cedolini

test.describe("commenti: payroll entity send", () => {
  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("sends on cedolino focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}cedolino ${Date.now()}`
    await gotoCedolini(page)
    await openCardSheet(page, todo.id)
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })
})
