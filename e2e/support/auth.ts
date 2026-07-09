import { expect, type Page } from "@playwright/test"

import { OPERATORS, type OperatorRole } from "../constants"
import { selectors } from "./selectors"

const AUTH_TIMEOUT_MS = 30_000

export async function expectLoginForm(page: Page) {
  await expect(page.getByRole("heading", { name: selectors.loginHeading })).toBeVisible({
    timeout: AUTH_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.loginEmail)).toBeVisible()
  await expect(page.locator(selectors.loginPassword)).toBeVisible()
  await expect(page.locator(selectors.loginSubmit)).toBeVisible()
  await expect(page.locator(selectors.appSidebar)).toHaveCount(0)
}

export async function loginWithOperator(page: Page, role: OperatorRole = "recruiter") {
  const operator = OPERATORS[role]
  await page.locator(selectors.loginEmail).fill(operator.email)
  await page.locator(selectors.loginPassword).fill(operator.password)
  await page.locator(selectors.loginSubmit).click()
  await expect(page.locator(selectors.appSidebar)).toBeVisible({
    timeout: AUTH_TIMEOUT_MS,
  })
  await expect(page.locator(selectors.loginEmail)).toHaveCount(0)
}

export async function logoutFromSidebar(page: Page) {
  await page.locator(selectors.sidebarMenuUser).click()
  await page.locator(selectors.sidebarMenuLogout).click()
  await expectLoginForm(page)
}
