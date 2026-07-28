import { describe, expect, it } from "vitest"

import { normalizeRoleTokens, resolveRolePill } from "../role-pill"

describe("role-pill", () => {
  it("prefers recruiter over payroll when multiple tokens are present", () => {
    expect(resolveRolePill(["payroll", "recruiter"])).toBe("Recruiter")
  })

  it("follows precedence recruiter → customer → sales → payroll", () => {
    expect(resolveRolePill(["sales", "customer"])).toBe("Customer")
    expect(resolveRolePill(["payroll"])).toBe("Payroll")
  })

  it("falls back to Operatore when no known token exists", () => {
    expect(resolveRolePill([])).toBe("Operatore")
    expect(resolveRolePill(normalizeRoleTokens(["admin"]))).toBe("Operatore")
  })

  it("normalizes role tokens from operatori.ruolo arrays", () => {
    expect(normalizeRoleTokens([" Recruiter ", "CUSTOMER"])).toEqual([
      "recruiter",
      "customer",
    ])
  })
})
