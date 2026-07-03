/**
 * Smoke test for Rule 3 (module boundary) in eslint.config.js.
 * Uses ESLint programmatic API so we don't need a committed violation file
 * that would fail the normal lint pass.
 */
import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

async function lintImport(source: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() })
  const [result] = await eslint.lintText(source, { filePath })
  return result?.messages ?? []
}

describe("eslint module boundary (Rule 3)", () => {
  it("flags deep .api.ts import from a page consumer", async () => {
    const messages = await lintImport(
      'import { fetchTickets } from "@/modules/support/support.api"\n',
      "src/pages/support-page.tsx",
    )

    expect(
      messages.some(
        (message) =>
          message.ruleId === "no-restricted-imports" &&
          message.message.includes("subfolder"),
      ),
    ).toBe(true)
  })

  it("allows subfolder barrel import from a page consumer", async () => {
    const messages = await lintImport(
      'import { useSupportTicketsBoard } from "@/modules/support/hooks"\n',
      "src/pages/support-page.tsx",
    )

    expect(messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(
      false,
    )
  })

  it("allows same-module .api import inside src/modules/", async () => {
    const messages = await lintImport(
      'import { fetchTickets } from "../support.api"\n',
      "src/modules/support/queries/use-tickets-query.ts",
    )

    expect(messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(
      false,
    )
  })
})
