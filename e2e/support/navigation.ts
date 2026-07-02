import { expect, type Page } from "@playwright/test"

import { selectors } from "./selectors"

const NAV_TIMEOUT_MS = 30_000

type NavTarget = {
  categorySlug: string
  linkId: string
  label: string
  urlPattern: RegExp
  assertReady: (page: Page) => Promise<void>
}

export const MAIN_NAV_TARGETS: NavTarget[] = [
  {
    categorySlug: "crm-famiglie",
    linkId: "crm_pipeline_famiglie",
    label: "Pipeline Famiglie",
    urlPattern: /\/pipeline$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.pipeline.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "crm-famiglie",
    linkId: "crm_assegnazione",
    label: "Assegnazione",
    urlPattern: /\/assegnazione$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.assegnazione.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "ricerca",
    linkId: "ricerca_pipeline",
    label: "Ricerche attive",
    urlPattern: /\/ricerca$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.ricerca.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "lavoratori",
    linkId: "lavoratori_cerca",
    label: "Cerca Lavoratori",
    urlPattern: /\/cerca-lavoratori$/,
    assertReady: async (page) => {
      await expect(page.locator(selectors.lavoratori.searchInput)).toBeVisible({
        timeout: NAV_TIMEOUT_MS,
      })
    },
  },
  {
    categorySlug: "lavoratori",
    linkId: "gate_1",
    label: "Gate 1",
    urlPattern: /\/gate-1$/,
    assertReady: async (page) => {
      await expect(page.getByRole("link", { name: "Colloquio Milano" })).toBeVisible({
        timeout: NAV_TIMEOUT_MS,
      })
    },
  },
  {
    categorySlug: "lavoratori",
    linkId: "gate_2",
    label: "Gate 2",
    urlPattern: /\/gate-2$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("combobox").filter({ hasText: "Solo idonei" }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "gestione-contrattuale",
    linkId: "gestione_contrattuale_assunzioni",
    label: "Assunzioni",
    urlPattern: /\/gestione-contrattuale\/assunzioni$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.assunzioni.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "gestione-contrattuale",
    linkId: "gestione_contrattuale_chiusure",
    label: "Chiusure",
    urlPattern: /\/gestione-contrattuale\/chiusure$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.chiusure.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "payroll",
    linkId: "payroll_cedolini",
    label: "Cedolini",
    urlPattern: /\/payroll\/cedolini$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.cedolini.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "customer-support",
    linkId: "prove_colloqui",
    label: "Prove e Colloqui",
    urlPattern: /\/customer-support\/prove-e-colloqui$/,
    assertReady: async (page) => {
      await expect(
        page.getByRole("heading", { name: selectors.proveColloqui.heading }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    },
  },
  {
    categorySlug: "anagrafiche",
    linkId: "anagrafiche-famiglie",
    label: "Famiglie",
    urlPattern: /\/famiglie$/,
    assertReady: async (page) => {
      await expect(page.locator(selectors.anagrafiche.tab("famiglie"))).toHaveAttribute(
        "data-state",
        "active",
      )
    },
  },
]

export async function expandSidebarCategory(page: Page, categorySlug: string) {
  const trigger = page.locator(selectors.sidebarCategory(categorySlug))
  if ((await trigger.getAttribute("data-state")) !== "open") {
    await trigger.click()
  }
  await expect(trigger).toHaveAttribute("data-state", "open")
}

export async function clickSidebarLink(page: Page, linkId: string) {
  const link = page.locator(selectors.sidebarLink(linkId))
  await expect(link).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await link.click()
}

export async function navigateViaSidebar(page: Page, target: NavTarget) {
  await expandSidebarCategory(page, target.categorySlug)
  await clickSidebarLink(page, target.linkId)
  await expect(page).toHaveURL(target.urlPattern, { timeout: NAV_TIMEOUT_MS })
  await target.assertReady(page)
}
