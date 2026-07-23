import { ROLE_PILL_LABELS, ROLE_PRECEDENCE } from "./consts"
import type { OperatorRoleToken } from "../types/operator"

export function normalizeRoleTokens(raw: unknown): OperatorRoleToken[] {
  if (!Array.isArray(raw)) return []
  const tokens: OperatorRoleToken[] = []
  for (const entry of raw) {
    if (typeof entry !== "string") continue
    const normalized = entry.trim().toLowerCase()
    if (
      normalized === "customer" ||
      normalized === "sales" ||
      normalized === "recruiter" ||
      normalized === "payroll"
    ) {
      tokens.push(normalized)
    }
  }
  return tokens
}

export function resolveRolePill(tokens: OperatorRoleToken[]): string {
  for (const token of ROLE_PRECEDENCE) {
    if (tokens.includes(token)) {
      return ROLE_PILL_LABELS[token]
    }
  }
  return "Operatore"
}

export function rolePillLabelForToken(token: OperatorRoleToken): string {
  return ROLE_PILL_LABELS[token]
}
