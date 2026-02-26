export type FilterLogic = "and" | "or"

export type FilterOperator =
  | "is"
  | "is_not"
  | "has"
  | "not_has"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"

export type FilterField = {
  label: string
  value: string
  options?: Array<{
    label: string
    value: string
  }>
}

export type FilterCondition = {
  kind: "condition"
  id: string
  field: string
  operator: FilterOperator
  value: string
}

export type FilterGroup = {
  kind: "group"
  id: string
  logic: FilterLogic
  nodes: FilterNode[]
}

export type FilterNode = FilterCondition | FilterGroup

export const filterOperators: Array<{
  label: string
  value: FilterOperator
  needsValue: boolean
}> = [
  { label: "is", value: "is", needsValue: true },
  { label: "is not", value: "is_not", needsValue: true },
  { label: "has", value: "has", needsValue: true },
  { label: "doesn't have", value: "not_has", needsValue: true },
  { label: "starts with", value: "starts_with", needsValue: true },
  { label: "ends with", value: "ends_with", needsValue: true },
  { label: "is empty", value: "is_empty", needsValue: false },
  { label: "is not empty", value: "is_not_empty", needsValue: false },
]

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export function createEmptyCondition(field = "id"): FilterCondition {
  return {
    kind: "condition",
    id: createId(),
    field,
    operator: "is",
    value: "",
  }
}

export function createEmptyGroup(logic: FilterLogic = "and"): FilterGroup {
  return {
    kind: "group",
    id: createId(),
    logic,
    nodes: [],
  }
}

export function countConditions(group: FilterGroup): number {
  return group.nodes.reduce((count, node) => {
    if (node.kind === "condition") return count + 1
    return count + countConditions(node)
  }, 0)
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim().toLowerCase()
}

function evaluateCondition(
  row: Record<string, unknown>,
  condition: FilterCondition
): boolean {
  const raw = row[condition.field]
  const left = normalize(raw)
  const right = normalize(condition.value)

  switch (condition.operator) {
    case "is":
      return left === right
    case "is_not":
      return left !== right
    case "has":
      return left.includes(right)
    case "not_has":
      return !left.includes(right)
    case "starts_with":
      return left.startsWith(right)
    case "ends_with":
      return left.endsWith(right)
    case "is_empty":
      return left.length === 0
    case "is_not_empty":
      return left.length > 0
    default:
      return true
  }
}

export function evaluateGroup(
  row: Record<string, unknown>,
  group: FilterGroup
): boolean {
  if (group.nodes.length === 0) return true

  const results = group.nodes.map((node) => {
    if (node.kind === "condition") {
      return evaluateCondition(row, node)
    }

    return evaluateGroup(row, node)
  })

  if (group.logic === "and") return results.every(Boolean)
  return results.some(Boolean)
}
