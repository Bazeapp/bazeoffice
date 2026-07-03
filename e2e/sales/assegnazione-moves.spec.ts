import { expect, test } from "@playwright/test"

import { E2E_ASSEGNAZIONE } from "../constants"
import {
  assignRecruiterOnCard,
  dragCardToDay,
  dragCardToUnassigned,
  expectCardInDayColumn,
  expectCardInUnassignedPanel,
  expectCardNotInDayColumn,
  getCard,
  getDayColumn,
  getTodayUtcDateKey,
  gotoAssegnazione,
  reloadAssegnazione,
} from "../support/assegnazione"
import {
  readProcessoAssegnazioneFields,
  resetAssegnazioneFixture,
} from "../support/processo-mutations"
import { selectors } from "../support/selectors"

const { unassignedNuova, unassignedWithRecruiter, assignedToday } = E2E_ASSEGNAZIONE.processi
const recruiterLabel = E2E_ASSEGNAZIONE.operatori.recruiter.displayName

test.describe("assegnazione: scheduling moves", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async ({ page }) => {
    await resetAssegnazioneFixture()
    await reloadAssegnazione(page)
  })

  test("assigning recruiter on card persists to the database", async ({ page }) => {
    await gotoAssegnazione(page)
    await expectCardInUnassignedPanel(page, unassignedNuova.id)

    await assignRecruiterOnCard(page, unassignedNuova.id, recruiterLabel)

    const persisted = await readProcessoAssegnazioneFields(unassignedNuova.id)
    expect(persisted.recruiterId).toBe(E2E_ASSEGNAZIONE.operatori.recruiter.id)
  })

  test("drop on calendar day moves card and persists after reload", async ({ page }) => {
    const today = getTodayUtcDateKey()

    await gotoAssegnazione(page)
    await expectCardInUnassignedPanel(page, unassignedWithRecruiter.id)

    await dragCardToDay(page, unassignedWithRecruiter.id, today)
    await expectCardInDayColumn(page, unassignedWithRecruiter.id, today)
    await expect(
      page.locator(selectors.assegnazione.unassignedPanel).locator(
        selectors.assegnazione.card(unassignedWithRecruiter.id),
      ),
    ).toHaveCount(0)

    const persisted = await readProcessoAssegnazioneFields(unassignedWithRecruiter.id)
    expect(persisted.dataAssegnazione).toBe(today)
    expect(["fare ricerca", "fare_ricerca"]).toContain(persisted.statoRes)

    await reloadAssegnazione(page)
    await expectCardInDayColumn(page, unassignedWithRecruiter.id, today)
  })

  test("drop back to unassigned clears assignment date", async ({ page }) => {
    const today = getTodayUtcDateKey()

    await gotoAssegnazione(page)
    await expectCardInDayColumn(page, assignedToday.id, today)

    await dragCardToUnassigned(page, assignedToday.id)
    await expectCardInUnassignedPanel(page, assignedToday.id)
    await expectCardNotInDayColumn(page, assignedToday.id, today)

    const persisted = await readProcessoAssegnazioneFields(assignedToday.id)
    expect(persisted.dataAssegnazione).toBeNull()
    expect(["da assegnare", "da_assegnare"]).toContain(persisted.statoRes)
  })

  test("drop on day without recruiter does not schedule the search", async ({ page }) => {
    const today = getTodayUtcDateKey()

    await gotoAssegnazione(page)
    const card = getCard(page, unassignedNuova.id)
    const column = getDayColumn(page, today)
    await card.scrollIntoViewIfNeeded()
    await column.scrollIntoViewIfNeeded()
    await card.dragTo(column)

    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: /Per assegnare una ricerca a una data devi prima selezionare il recruiter/i,
      }),
    ).toBeVisible({ timeout: 10_000 })
    await expectCardInUnassignedPanel(page, unassignedNuova.id)

    const persisted = await readProcessoAssegnazioneFields(unassignedNuova.id)
    expect(persisted.dataAssegnazione).toBeNull()
  })
})
