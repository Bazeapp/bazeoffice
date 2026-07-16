import { test } from "@playwright/test"

import { E2E_ASSUNZIONI, E2E_COMMENTI_BODY_PREFIX, E2E_RAPPORTI } from "../constants"
import { expectCommentBodyVisible, sendComment } from "../support/commenti"
import { resetCommentiFixture } from "../support/commenti-mutations"
import {
  gotoAssunzioni,
  openCardSheet,
  waitForAssunzioniDetail,
} from "../support/assunzioni"
import {
  gotoRapporti,
  selectRapportoCard,
  waitForRapportoDetail,
} from "../support/rapporti"

const { inAttivazione } = E2E_RAPPORTI.rapporti
const { inviataRichiestaDati } = E2E_ASSUNZIONI.rapporti

test.describe("commenti: customer entity send", () => {
  test.describe.configure({ timeout: 90_000 })

  test.afterEach(async () => {
    await resetCommentiFixture()
  })

  test("sends on rapporto focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}rapporto ${Date.now()}`
    await gotoRapporti(page)
    await selectRapportoCard(page, inAttivazione.id)
    await waitForRapportoDetail(page)
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })

  test("sends on assunzione focus", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}assunzione ${Date.now()}`
    await gotoAssunzioni(page)
    await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })
})
