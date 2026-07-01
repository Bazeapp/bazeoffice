import { expect, test } from "@playwright/test"

import { E2E_CHIUSURE } from "../constants"
import { gotoChiusure, openAnnullamentoDialog, reloadChiusure } from "../support/chiusure"
import { resetChiusureFixture } from "../support/chiusure-mutations"
import { getSupabaseAdmin } from "../support/supabase-admin"

const { annullamentoRapporto } = E2E_CHIUSURE

test.describe("chiusure: annullamento create", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 })

  test.afterEach(async () => {
    await resetChiusureFixture()
  })

  test("creates annullamento for selected rapporto and persists", async ({ page }) => {
    await gotoChiusure(page)
    const dialog = await openAnnullamentoDialog(page)

    await dialog
      .getByPlaceholder("Cerca per famiglia o lavoratore...")
      .fill(annullamentoRapporto.lavoratoreSearchText)
    await dialog
      .locator(`[data-testid="chiusure-annullamento-rapporto-${annullamentoRapporto.id}"]`)
      .click()

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/create-record") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30_000 },
    )
    await dialog.getByRole("button", { name: "Crea annullamento" }).click()
    await createResponse

    await expect(dialog).toHaveCount(0)

    const { data } = await getSupabaseAdmin()
      .from("rapporti_lavorativi")
      .select("fine_rapporto_lavorativo_id")
      .eq("id", annullamentoRapporto.id)
      .maybeSingle()

    expect((data as { fine_rapporto_lavorativo_id: string | null } | null)?.fine_rapporto_lavorativo_id).toBeTruthy()

    await reloadChiusure(page)
  })
})
