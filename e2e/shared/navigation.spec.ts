import { expect, test } from "@playwright/test"

import {
  clickSidebarLink,
  expandSidebarCategory,
  MAIN_NAV_TARGETS,
  navigateViaSidebar,
} from "../support/navigation"
import { selectors } from "../support/selectors"

test.describe("app shell: navigation", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test("sidebar navigates between main sections", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator(selectors.appSidebar)).toBeVisible({ timeout: 30_000 })

    for (const target of MAIN_NAV_TARGETS) {
      await navigateViaSidebar(page, target)
    }
  })

  test("opening a child in another group collapses the previous accordion", async ({
    page,
  }) => {
    await page.goto("/")

    await expandSidebarCategory(page, "crm-famiglie")
    await clickSidebarLink(page, "crm_pipeline_famiglie")
    await expect(page.locator(selectors.sidebarCategory("crm-famiglie"))).toHaveAttribute(
      "data-state",
      "open",
    )

    await expandSidebarCategory(page, "ricerca")
    await clickSidebarLink(page, "ricerca_pipeline")
    await expect(page.locator(selectors.sidebarCategory("ricerca"))).toHaveAttribute(
      "data-state",
      "open",
    )
    await expect(page.locator(selectors.sidebarCategory("crm-famiglie"))).toHaveAttribute(
      "data-state",
      "closed",
    )
  })

  test("theme toggle switches and persists across reload", async ({ page }) => {
    await page.goto("/")

    const themeButton = page.getByRole("button", { name: /Tema (Davide|chiaro)/ })
    const initialLabel = (await themeButton.textContent()) ?? ""
    await themeButton.click()
    await expect(themeButton).not.toHaveText(initialLabel)

    const labelAfterToggle = (await themeButton.textContent()) ?? ""
    await page.reload()
    await expect(page.getByRole("button", { name: labelAfterToggle })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("unknown route falls back to default anagrafiche home", async ({ page }) => {
    await page.goto("this-route-does-not-exist")
    await expect(page.locator(selectors.anagrafiche.tab("famiglie"))).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).toHaveURL(/\/famiglie$/)
  })
})
