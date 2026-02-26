import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"

import {
  createEmptyCondition,
  createEmptyGroup,
  filterOperators,
  type FilterField,
  type FilterGroup,
  type FilterNode,
} from "@/components/data-table/data-table-filters"
import { Button } from "@/components/ui/button"
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
  defaultField: string
): FilterGroup {
  if (group.id === groupId) {
    return {
      ...group,
      nodes: [...group.nodes, createEmptyCondition(defaultField)],
    }
  }

  return {
    ...group,
    nodes: group.nodes.map((node) => {
      if (node.kind === "group") {
        return addConditionToGroup(node, groupId, defaultField)
      }
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
  const availableForNewCondition = fields.find((field) => !usedFields.has(field.value))

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
                      onChange(
                        updateNode(group, node.id, () => {
                          return updatedChild
                        })
                      )
                    }}
                    onRemove={() => onChange(removeNode(group, node.id))}
                  />
                </div>
              </div>
            )
          }

          const operatorMeta = filterOperators.find(
            (item) => item.value === node.operator
          )
          const selectedField = fields.find((field) => field.value === node.field)
          const valueOptions = selectedField?.options ?? []

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
                      onChange(
                        updateNode(group, node.id, (current) => ({
                          ...(current as typeof node),
                          field: value,
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
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    )
                  })()}

                  <Select
                    value={node.operator}
                    onValueChange={(value) => {
                      onChange(
                        updateNode(group, node.id, (current) => ({
                          ...(current as typeof node),
                          operator: value as typeof node.operator,
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
                      {filterOperators.map((operator) => (
                        <SelectItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {operatorMeta?.needsValue ? (
                    valueOptions.length > 0 ? (
                      <Select
                        value={node.value || undefined}
                        onValueChange={(value) => {
                          onChange(
                            updateNode(group, node.id, (current) => ({
                              ...(current as typeof node),
                              value,
                            }))
                          )
                        }}
                      >
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
                    ) : (
                      <Input
                        className="h-9 rounded-none border-0 border-r text-sm md:max-w-[220px]"
                        value={node.value}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          onChange(
                            updateNode(group, node.id, (current) => ({
                              ...(current as typeof node),
                              value: nextValue,
                            }))
                          )
                        }}
                        placeholder="Valore"
                      />
                    )
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
                availableForNewCondition?.value ?? firstField
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
