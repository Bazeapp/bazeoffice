import { test } from "@playwright/test"

import { E2E_ASSUNZIONI, E2E_COMMENTI_BODY_PREFIX, E2E_RAPPORTI } from "../constants"
import {
  entitySectionId,
  expandCommentsSection,
  expectCommentBodyVisible,
  sendComment,
} from "../support/commenti"
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

  // Assunzioni cards without an `assunzioni` row open a pending ASSUNZIONE
  // section (composer locked). Writes go through the RAPPORTO section.
  test("sends on assunzione board via rapporto section", async ({ page }) => {
    const body = `${E2E_COMMENTI_BODY_PREFIX}assunzione ${Date.now()}`
    await gotoAssunzioni(page)
    await openCardSheet(page, inviataRichiestaDati.id)
    await waitForAssunzioniDetail(page)
    await expandCommentsSection(
      page,
      entitySectionId("rapporto", inviataRichiestaDati.id),
    )
    await sendComment(page, body)
    await expectCommentBodyVisible(page, body)
  })
})
