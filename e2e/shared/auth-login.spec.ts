import { expect, test } from "@playwright/test"

import { OPERATORS } from "../constants"
import { expectLoginForm, loginWithOperator } from "../support/auth"
import { selectors } from "../support/selectors"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("authentication: login", () => {
  test.describe.configure({ timeout: 60_000 })

  test("login form renders for unauthenticated visitor", async ({ page }) => {
    await page.goto("/")
    await expectLoginForm(page)
  })

  test("successful login enters the app", async ({ page }) => {
    await page.goto("/")
    await loginWithOperator(page, "recruiter")
    await expect(page.locator(selectors.appSidebar)).toBeVisible()
    await expect(page.getByRole("heading", { name: selectors.loginHeading })).toHaveCount(0)
  })

  test("invalid credentials show an error", async ({ page }) => {
    await page.goto("/")
    await page.locator(selectors.loginEmail).fill(OPERATORS.recruiter.email)
    await page.locator(selectors.loginPassword).fill("wrong-password")
    await page.locator(selectors.loginSubmit).click()

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(selectors.loginEmail)).toBeVisible()
    await expect(page.locator(selectors.appSidebar)).toHaveCount(0)
  })

  test("empty-field validation blocks submit", async ({ page }) => {
    await page.goto("/")
    let authCalled = false
    page.on("request", (request) => {
      if (request.url().includes("/auth/v1/token")) {
        authCalled = true
      }
    })

    await page.locator(selectors.loginEmail).fill("test@example.com")
    await page.locator(selectors.loginPassword).evaluate((el) => el.removeAttribute("required"))
    await page.locator(selectors.loginSubmit).click()
    await expect(page.getByRole("alert")).toContainText("Inserisci email e password")
    await page.waitForTimeout(300)
    expect(authCalled).toBe(false)
    await expectLoginForm(page)
  })
})
