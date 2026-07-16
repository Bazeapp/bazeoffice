import { test } from "@playwright/test"

import { E2E_COMMENTI_BODY_PREFIX, E2E_PIPELINE } from "../constants"
import { expectCommentBodyVisible, sendComment } from "../support/commenti"
import { resetCommentiFixture } from "../support/commenti-mutations"
import { gotoPipeline, openCardSheet } from "../support/pipeline"

const { template } = E2E_PIPELINE.processi

test.describe("commenti: sales entity send", () => {
  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("sends on CRM pipeline ricerca focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}pipeline ricerca ${Date.now()}`
    await gotoPipeline(page)
    await openCardSheet(page, template.id)
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })
})
