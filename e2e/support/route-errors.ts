import type { Page } from "@playwright/test"

import { getLocalSupabaseConfig } from "../constants"

/**
 * Intercept a Supabase RPC call and return a failure response.
 * Use in future feature specs (e.g. Ricerca board load failure).
 */
export async function interceptRpc(
  page: Page,
  rpcName: string,
  status = 500,
) {
  const pattern = `**/rest/v1/rpc/${rpcName}*`
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        message: `E2E injected ${status} for rpc ${rpcName}`,
      }),
    })
  })
}

/**
 * Intercept a Supabase edge function and return a failure response.
 */
export async function interceptEdgeFunction(
  page: Page,
  functionName: string,
  status = 500,
) {
  const functionsOrigin = getLocalSupabaseConfig().VITE_SUPABASE_URL.replace(
    /\/$/,
    "",
  )
  const pattern = `${functionsOrigin}/functions/v1/${functionName}*`
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        error: `E2E injected ${status} for function ${functionName}`,
      }),
    })
  })
}

/**
 * Intercept a Supabase edge function and return a custom success body.
 */
export async function mockEdgeFunctionSuccess(
  page: Page,
  functionName: string,
  body: Record<string, unknown>,
) {
  const functionsOrigin = getLocalSupabaseConfig().VITE_SUPABASE_URL.replace(
    /\/$/,
    "",
  )
  const pattern = `${functionsOrigin}/functions/v1/${functionName}*`
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}
