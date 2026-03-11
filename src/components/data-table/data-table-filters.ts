export type FilterLogic = "and" | "or"

export type FilterOperator =
  | "is"
  | "is_not"
  | "has"
  | "not_has"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_true"
  | "is_false"
  | "has_any"
  | "has_all"
  | "not_has_any"
  | "is_empty"
  | "is_not_empty"

export type FilterFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "multi_enum"
  | "id"

export type FilterField = {
  label: string
  value: string
  type?: FilterFieldType
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
  valueTo?: string
}

export type FilterGroup = {
  kind: "group"
  id: string
  logic: FilterLogic
  nodes: FilterNode[]
}

export type FilterNode = FilterCondition | FilterGroup

export type FilterOperatorMeta = {
  label: string
  value: FilterOperator
  needsValue: boolean
  needsSecondValue?: boolean
  fieldTypes: FilterFieldType[]
}

const ALL_FIELD_TYPES: FilterFieldType[] = [
  "text",
  "number",
  "date",
  "boolean",
  "enum",
  "multi_enum",
  "id",
]

export const filterOperators: FilterOperatorMeta[] = [
  {
    label: "is",
    value: "is",
    needsValue: true,
    fieldTypes: ["text", "number", "date", "boolean", "enum", "id"],
  },
  {
    label: "is not",
    value: "is_not",
    needsValue: true,
    fieldTypes: ["text", "number", "date", "boolean", "enum", "id"],
  },
  { label: "has", value: "has", needsValue: true, fieldTypes: ["text", "multi_enum", "id"] },
  {
    label: "doesn't have",
    value: "not_has",
    needsValue: true,
    fieldTypes: ["text", "multi_enum", "id"],
  },
  { label: "starts with", value: "starts_with", needsValue: true, fieldTypes: ["text", "id"] },
  { label: "ends with", value: "ends_with", needsValue: true, fieldTypes: ["text", "id"] },
  { label: ">", value: "gt", needsValue: true, fieldTypes: ["number", "date"] },
  { label: ">=", value: "gte", needsValue: true, fieldTypes: ["number", "date"] },
  { label: "<", value: "lt", needsValue: true, fieldTypes: ["number", "date"] },
  { label: "<=", value: "lte", needsValue: true, fieldTypes: ["number", "date"] },
  {
    label: "between",
    value: "between",
    needsValue: true,
    needsSecondValue: true,
    fieldTypes: ["number", "date"],
  },
  { label: "is true", value: "is_true", needsValue: false, fieldTypes: ["boolean"] },
  { label: "is false", value: "is_false", needsValue: false, fieldTypes: ["boolean"] },
  { label: "has any", value: "has_any", needsValue: true, fieldTypes: ["multi_enum"] },
  { label: "has all", value: "has_all", needsValue: true, fieldTypes: ["multi_enum"] },
  {
    label: "doesn't have any",
    value: "not_has_any",
    needsValue: true,
    fieldTypes: ["multi_enum"],
  },
  {
    label: "is empty",
    value: "is_empty",
    needsValue: false,
    fieldTypes: ALL_FIELD_TYPES,
  },
  {
    label: "is not empty",
    value: "is_not_empty",
    needsValue: false,
    fieldTypes: ALL_FIELD_TYPES,
  },
]

export function getOperatorsForField(fieldType: FilterFieldType | undefined) {
  const resolvedType = fieldType ?? "text"
  return filterOperators.filter((operator) =>
    operator.fieldTypes.includes(resolvedType)
  )
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export function createEmptyCondition(
  field = "id",
  fieldType: FilterFieldType = "text"
): FilterCondition {
  const defaultOperator = getOperatorsForField(fieldType)[0]?.value ?? "is"
  return {
    kind: "condition",
    id: createId(),
    field,
    operator: defaultOperator,
    value: "",
    valueTo: "",
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

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const token = value.trim().toLowerCase()
    if (["true", "1", "si", "sì", "yes"].includes(token)) return true
    if (["false", "0", "no"].includes(token)) return false
  }
  return null
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".")
    if (!normalized) return null
    const parsed = Number.parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseDate(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime()
  }

  if (typeof value !== "string") return null
  const normalized = value.trim()
  if (!normalized) return null

  const slashParts = normalized.split("/")
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts
    const parsed = new Date(
      Number.parseInt(year ?? "", 10),
      Number.parseInt(month ?? "", 10) - 1,
      Number.parseInt(day ?? "", 10)
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function toArrayTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)).filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
  }

  const normalized = normalize(value)
  if (!normalized) return []
  return [normalized]
}

function parseFilterList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

function evaluateCondition(
  row: Record<string, unknown>,
  condition: FilterCondition,
  fieldsMap?: Map<string, FilterField>
): boolean {
  const raw = row[condition.field]
  const fieldType = fieldsMap?.get(condition.field)?.type ?? "text"
  const left = normalize(raw)
  const right = normalize(condition.value)

  if (condition.operator === "is_empty") return isEmptyValue(raw)
  if (condition.operator === "is_not_empty") return !isEmptyValue(raw)

  if (condition.operator === "is_true") return parseBoolean(raw) === true
  if (condition.operator === "is_false") return parseBoolean(raw) === false

  if (fieldType === "number") {
    const leftNum = parseNumber(raw)
    const rightNum = parseNumber(condition.value)
    const rightToNum = parseNumber(condition.valueTo)

    switch (condition.operator) {
      case "is":
        return leftNum !== null && rightNum !== null && leftNum === rightNum
      case "is_not":
        return leftNum !== null && rightNum !== null && leftNum !== rightNum
      case "gt":
        return leftNum !== null && rightNum !== null && leftNum > rightNum
      case "gte":
        return leftNum !== null && rightNum !== null && leftNum >= rightNum
      case "lt":
        return leftNum !== null && rightNum !== null && leftNum < rightNum
      case "lte":
        return leftNum !== null && rightNum !== null && leftNum <= rightNum
      case "between":
        return (
          leftNum !== null &&
          rightNum !== null &&
          rightToNum !== null &&
          leftNum >= Math.min(rightNum, rightToNum) &&
          leftNum <= Math.max(rightNum, rightToNum)
        )
      default:
        return true
    }
  }

  if (fieldType === "date") {
    const leftDate = parseDate(raw)
    const rightDate = parseDate(condition.value)
    const rightToDate = parseDate(condition.valueTo)
    const leftDay = leftDate !== null ? new Date(leftDate).toDateString() : null
    const rightDay = rightDate !== null ? new Date(rightDate).toDateString() : null

    switch (condition.operator) {
      case "is":
        return leftDay !== null && rightDay !== null && leftDay === rightDay
      case "is_not":
        return leftDay !== null && rightDay !== null && leftDay !== rightDay
      case "gt":
        return leftDate !== null && rightDate !== null && leftDate > rightDate
      case "gte":
        return leftDate !== null && rightDate !== null && leftDate >= rightDate
      case "lt":
        return leftDate !== null && rightDate !== null && leftDate < rightDate
      case "lte":
        return leftDate !== null && rightDate !== null && leftDate <= rightDate
      case "between":
        return (
          leftDate !== null &&
          rightDate !== null &&
          rightToDate !== null &&
          leftDate >= Math.min(rightDate, rightToDate) &&
          leftDate <= Math.max(rightDate, rightToDate)
        )
      default:
        return true
    }
  }

  if (fieldType === "boolean") {
    const leftBoolean = parseBoolean(raw)
    const rightBoolean = parseBoolean(condition.value)

    switch (condition.operator) {
      case "is":
        return leftBoolean !== null && rightBoolean !== null && leftBoolean === rightBoolean
      case "is_not":
        return leftBoolean !== null && rightBoolean !== null && leftBoolean !== rightBoolean
      default:
        return true
    }
  }

  if (fieldType === "multi_enum") {
    const tokens = toArrayTokens(raw)
    const list = parseFilterList(condition.value)

    switch (condition.operator) {
      case "is":
      case "has":
        return tokens.includes(right)
      case "is_not":
      case "not_has":
        return !tokens.includes(right)
      case "has_any":
        return list.some((token) => tokens.includes(token))
      case "has_all":
        return list.every((token) => tokens.includes(token))
      case "not_has_any":
        return !list.some((token) => tokens.includes(token))
      default:
        return true
    }
  }

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
    default:
      return true
  }
}

export function evaluateGroup(
  row: Record<string, unknown>,
  group: FilterGroup,
  fields?: FilterField[]
): boolean {
  const fieldsMap = fields
    ? new Map(fields.map((field) => [field.value, field]))
    : undefined

  function evaluateNested(currentGroup: FilterGroup): boolean {
    if (currentGroup.nodes.length === 0) return true

    const results = currentGroup.nodes.map((node) => {
      if (node.kind === "condition") {
        return evaluateCondition(row, node, fieldsMap)
      }

      return evaluateNested(node)
    })

    if (currentGroup.logic === "and") return results.every(Boolean)
    return results.some(Boolean)
  }

  return evaluateNested(group)
}
