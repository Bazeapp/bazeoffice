import {
  AtSignIcon,
  CalendarIcon,
  CheckIcon,
  CircleDotIcon,
  GripVerticalIcon,
  HashIcon,
  ListFilterIcon,
  PlusIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react"

import {
  createEmptyCondition,
  createEmptyGroup,
  getOperatorsForField,
  type FilterField,
  type FilterFieldType,
  type FilterGroup,
  type FilterNode,
} from "@/components/data-table/data-table-filters"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DataTableFilterBuilderProps = {
  fields: FilterField[]
  group: FilterGroup
  onChange: (group: FilterGroup) => void
  isRoot?: boolean
  onRemove?: () => void
  depth?: number
  rootGroup?: FilterGroup
}

function getFieldTypeIcon(fieldType: FilterFieldType | undefined) {
  switch (fieldType) {
    case "id":
      return AtSignIcon
    case "number":
      return HashIcon
    case "date":
      return CalendarIcon
    case "boolean":
      return CheckIcon
    case "enum":
      return CircleDotIcon
    case "multi_enum":
      return ListFilterIcon
    case "text":
    default:
      return TypeIcon
  }
}

function updateNode(
  group: FilterGroup,
  nodeId: string,
  updater: (node: FilterNode) => FilterNode
): FilterGroup {
  return {
    ...group,
    nodes: group.nodes.map((node) => {
      if (node.id === nodeId) return updater(node)
      if (node.kind === "group") return updateNode(node, nodeId, updater)
      return node
    }),
  }
}

function removeNode(group: FilterGroup, nodeId: string): FilterGroup {
  return {
    ...group,
    nodes: group.nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => {
        if (node.kind === "group") return removeNode(node, nodeId)
        return node
      }),
  }
}

function addConditionToGroup(
  group: FilterGroup,
  groupId: string,
  field: FilterField | undefined
): FilterGroup {
  if (group.id === groupId) {
    const defaultField = field?.value ?? "id"
    const defaultType = field?.type ?? "text"

    return {
      ...group,
      nodes: [...group.nodes, createEmptyCondition(defaultField, defaultType)],
    }
  }

  return {
    ...group,
    nodes: group.nodes.map((node) => {
      if (node.kind === "group") return addConditionToGroup(node, groupId, field)
      return node
    }),
  }
}

function addGroupToGroup(group: FilterGroup, groupId: string): FilterGroup {
  if (group.id === groupId) {
    return {
      ...group,
      nodes: [...group.nodes, createEmptyGroup("and")],
    }
  }

  return {
    ...group,
    nodes: group.nodes.map((node) => {
      if (node.kind === "group") return addGroupToGroup(node, groupId)
      return node
    }),
  }
}

function collectConditionFields(group: FilterGroup): string[] {
  return group.nodes.flatMap((node) => {
    if (node.kind === "condition") return [node.field]
    return collectConditionFields(node)
  })
}

type ValueControlProps = {
  node: Extract<FilterNode, { kind: "condition" }>
  field: FilterField | undefined
  fieldType: FilterFieldType
  needsSecondValue: boolean
  onValueChange: (value: string) => void
  onValueToChange: (valueTo: string) => void
}

function splitFilterList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

function ValueControl({
  node,
  field,
  fieldType,
  needsSecondValue,
  onValueChange,
  onValueToChange,
}: ValueControlProps) {
  const anchor = useComboboxAnchor()
  const valueOptions = field?.options ?? []
  const valueLabelByValue = new Map(valueOptions.map((option) => [option.value, option.label]))
  const useSingleSelect =
    (fieldType === "enum" ||
      (fieldType === "multi_enum" &&
        ["is", "is_not", "has", "not_has"].includes(node.operator))) &&
    valueOptions.length > 0
  const useMultiEnumLookupSelect =
    fieldType === "multi_enum" &&
    ["has_any", "has_all", "not_has_any"].includes(node.operator) &&
    valueOptions.length > 0

  if (fieldType === "boolean") {
    return (
      <Select value={node.value || undefined} onValueChange={onValueChange}>
        <SelectTrigger
          className="h-9 rounded-none border-0 border-r text-sm md:max-w-[260px]"
          size="sm"
        >
          <SelectValue placeholder="Valore" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Sì</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (useSingleSelect) {
    return (
      <Select value={node.value || undefined} onValueChange={onValueChange}>
        <SelectTrigger
          className="h-9 rounded-none border-0 border-r text-sm md:max-w-[260px]"
          size="sm"
        >
          <SelectValue placeholder="Valore" />
        </SelectTrigger>
        <SelectContent>
          {valueOptions.map((option) => (
            <SelectItem key={`${node.id}-${option.value}`} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (useMultiEnumLookupSelect) {
    const selectedValues = splitFilterList(node.value)

    return (
      <Combobox
        multiple
        autoHighlight
        items={valueOptions.map((option) => option.value)}
        value={selectedValues}
        onValueChange={(nextValues) => {
          onValueChange((nextValues as string[]).join(","))
        }}
      >
        <ComboboxChips
          ref={anchor}
          className="h-9 min-h-9 rounded-none border-0 border-r px-2 md:max-w-[320px]"
        >
          <ComboboxValue>
            {(values) => (
              <>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{valueLabelByValue.get(value) ?? value}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className="max-h-80">
          <ComboboxEmpty>Nessun valore trovato.</ComboboxEmpty>
          <ComboboxList className="max-h-72 overflow-y-auto">
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {valueLabelByValue.get(item) ?? item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  }

  const inputType =
    fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"
  const placeholder =
    fieldType === "multi_enum" &&
    ["has_any", "has_all", "not_has_any"].includes(node.operator)
      ? "Valori separati da virgola"
      : "Valore"

  return (
    <>
      <Input
        type={inputType}
        inputMode={fieldType === "number" ? "decimal" : undefined}
        className="h-9 rounded-none border-0 border-r text-sm md:max-w-[220px]"
        value={node.value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
      />
      {needsSecondValue ? (
        <Input
          type={inputType}
          inputMode={fieldType === "number" ? "decimal" : undefined}
          className="h-9 rounded-none border-0 border-r text-sm md:max-w-[220px]"
          value={node.valueTo ?? ""}
          onChange={(event) => onValueToChange(event.target.value)}
          placeholder="E"
        />
      ) : null}
    </>
  )
}

export function DataTableFilterBuilder({
  fields,
  group,
  onChange,
  isRoot = true,
  onRemove,
  depth = 0,
  rootGroup,
}: DataTableFilterBuilderProps) {
  const effectiveRootGroup = rootGroup ?? group
  const firstField = fields[0]?.value ?? "id"
  const logicLabel = group.logic === "and" ? "and" : "or"
  const usedFields = new Set(collectConditionFields(effectiveRootGroup))
  const availableForNewCondition = fields.find(
    (field) => !usedFields.has(field.value)
  )

  return (
    <div
      className={cn(
        "space-y-3",
        !isRoot && "rounded-lg border bg-muted/20 p-3",
        depth > 0 && "ml-4"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {isRoot ? "In this view, show rows where" : "Any of the following are true"}
          </span>
          <Select
            value={group.logic}
            onValueChange={(value) => {
              onChange({ ...group, logic: value as FilterGroup["logic"] })
            }}
          >
            <SelectTrigger className="h-7 w-[92px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">and</SelectItem>
              <SelectItem value="or">or</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isRoot ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onRemove}>
              <Trash2Icon />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <GripVerticalIcon />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {group.nodes.map((node, index) => {
          const rowPrefix = index === 0 ? "Where" : logicLabel

          if (node.kind === "group") {
            return (
              <div key={node.id} className="flex items-start gap-2">
                <div className="text-foreground w-14 pt-2 text-xs font-medium">
                  {rowPrefix}
                </div>
                <div className="flex-1">
                  <DataTableFilterBuilder
                    fields={fields}
                    group={node}
                    isRoot={false}
                    depth={depth + 1}
                    rootGroup={effectiveRootGroup}
                    onChange={(updatedChild) => {
                      onChange(updateNode(group, node.id, () => updatedChild))
                    }}
                    onRemove={() => onChange(removeNode(group, node.id))}
                  />
                </div>
              </div>
            )
          }

          const selectedField = fields.find((field) => field.value === node.field)
          const selectedFieldType = selectedField?.type ?? "text"
          const operators = getOperatorsForField(selectedFieldType)
          const fallbackOperators =
            operators.length > 0 ? operators : getOperatorsForField("text")
          const resolvedOperatorMeta =
            fallbackOperators.find((item) => item.value === node.operator) ??
            fallbackOperators[0]

          return (
            <div key={node.id} className="flex items-start gap-2">
              <div className="text-foreground w-14 pt-2 text-xs font-medium">
                {rowPrefix}
              </div>
              <div className="flex-1 rounded-lg border bg-background">
                <div className="flex flex-col md:flex-row md:items-center">
                  {(() => {
                    const usedByOthers = new Set(
                      collectConditionFields(effectiveRootGroup).filter(
                        (fieldValue) => fieldValue !== node.field
                      )
                    )
                    const allowedFields = fields.filter(
                      (field) => !usedByOthers.has(field.value)
                    )

                    return (
                      <Select
                        value={node.field}
                        onValueChange={(value) => {
                          const nextField = fields.find((field) => field.value === value)
                          const nextFieldType = nextField?.type ?? "text"
                          const nextOperator =
                            getOperatorsForField(nextFieldType)[0]?.value ?? "is"

                          onChange(
                            updateNode(group, node.id, (current) => ({
                              ...(current as typeof node),
                              field: value,
                              operator: nextOperator,
                              value: "",
                              valueTo: "",
                            }))
                          )
                        }}
                      >
                        <SelectTrigger
                          className="h-9 rounded-none border-0 border-r md:w-[190px]"
                          size="sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedFields.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              <span className="flex items-center gap-2">
                                {(() => {
                                  const Icon = getFieldTypeIcon(field.type)
                                  return <Icon className="text-muted-foreground size-3.5 shrink-0" />
                                })()}
                                <span>{field.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  })()}

                  <Select
                    value={resolvedOperatorMeta.value}
                    onValueChange={(value) => {
                      onChange(
                        updateNode(group, node.id, (current) => ({
                          ...(current as typeof node),
                          operator: value as typeof node.operator,
                          value: "",
                          valueTo: "",
                        }))
                      )
                    }}
                  >
                    <SelectTrigger
                      className="h-9 rounded-none border-0 border-r md:w-[160px]"
                      size="sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fallbackOperators.map((operator) => (
                        <SelectItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {resolvedOperatorMeta.needsValue ? (
                    <ValueControl
                      node={node}
                      field={selectedField}
                      fieldType={selectedFieldType}
                      needsSecondValue={resolvedOperatorMeta.needsSecondValue === true}
                      onValueChange={(value) => {
                        onChange(
                          updateNode(group, node.id, (current) => ({
                            ...(current as typeof node),
                            value,
                          }))
                        )
                      }}
                      onValueToChange={(valueTo) => {
                        onChange(
                          updateNode(group, node.id, (current) => ({
                            ...(current as typeof node),
                            valueTo,
                          }))
                        )
                      }}
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-9 flex-1 items-center border-r px-3 text-xs">
                      Nessun valore richiesto
                    </div>
                  )}

                  <div className="flex items-center px-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onChange(removeNode(group, node.id))}
                    >
                      <Trash2Icon />
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <GripVerticalIcon />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!availableForNewCondition}
          onClick={() =>
            onChange(
              addConditionToGroup(
                group,
                group.id,
                fields.find(
                  (field) =>
                    field.value === (availableForNewCondition?.value ?? firstField)
                )
              )
            )
          }
        >
          <PlusIcon />
          Add condition
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(addGroupToGroup(group, group.id))}
        >
          <PlusIcon />
          Add condition group
        </Button>
      </div>
    </div>
  )
}
