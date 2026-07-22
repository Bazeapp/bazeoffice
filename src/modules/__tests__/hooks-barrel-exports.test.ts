import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const MODULES_ROOT = join(process.cwd(), "src/modules")

function listHookBarrels(): string[] {
  return readdirSync(MODULES_ROOT)
    .filter((name) => statSync(join(MODULES_ROOT, name)).isDirectory())
    .map((name) => join(MODULES_ROOT, name, "hooks", "index.ts"))
    .filter((path) => {
      try {
        readFileSync(path)
        return true
      } catch {
        return false
      }
    })
}

function parseNamedExports(source: string): string[] {
  const names: string[] = []
  const exportBlocks = source.matchAll(/export\s*\{([^}]+)\}/g)
  for (const match of exportBlocks) {
    const block = match[1] ?? ""
    for (const part of block.split(",")) {
      const trimmed = part.trim()
      if (!trimmed) continue
      const exportName = trimmed.split(/\s+as\s+/).pop()?.trim()
      if (exportName) names.push(exportName)
    }
  }
  const direct = source.matchAll(
    /export\s+(?:type\s+)?(?:async\s+)?function\s+(use[A-Z]\w*)/g,
  )
  for (const match of direct) {
    if (match[1]) names.push(match[1])
  }
  return names
}

describe("hooks/index.ts barrels export only hooks", () => {
  for (const barrelPath of listHookBarrels()) {
    const moduleName = barrelPath.split("/modules/")[1]?.split("/")[0] ?? barrelPath
    it(`${moduleName}/hooks/index.ts exports only use* symbols`, () => {
      const source = readFileSync(barrelPath, "utf8")
      const exports = parseNamedExports(source)
      const violations = exports.filter((name) => !name.startsWith("use"))
      expect(violations, `Non-hook exports: ${violations.join(", ")}`).toEqual([])
    })
  }
})
