import type { SortingState, Table } from "@tanstack/react-table";
import {
  AtSignIcon,
  ArrowUpDownIcon,
  BookmarkIcon,
  CalendarIcon,
  CheckIcon,
  CircleDotIcon,
  HashIcon,
  ListFilterIcon,
  PlusIcon,
  SaveIcon,
  TypeIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { DataTableFilterBuilder } from "@/components/data-table/data-table-filter-builder";
import {
  countConditions,
  type FilterField,
  type FilterGroup,
} from "@/components/data-table/data-table-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type GroupOption = {
  label: string;
  value: string;
};

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  filters: FilterGroup;
  onFiltersChange: (value: FilterGroup) => void;
  filterFields: FilterField[];
  searchPlaceholder?: string;
  groupOptions?: GroupOption[];
  savedViews?: Array<{
    id: string;
    name: string;
    updatedAt: string;
  }>;
  activeViewId?: string | null;
  onSaveCurrentView?: (name: string) => void;
  onApplySavedView?: (id: string) => void;
  onDeleteSavedView?: (id: string) => void;
  enableGrouping?: boolean;
  compactControls?: boolean;
  onApplyFilters?: () => void;
  hasPendingFilters?: boolean;
};

function getColumnLabel(column: {
  id: string;
  columnDef: { header?: unknown };
}) {
  const header = column.columnDef.header;
  return typeof header === "string" ? header : column.id;
}

function getFieldTypeIcon(
  fieldType:
    | "text"
    | "number"
    | "date"
    | "boolean"
    | "enum"
    | "multi_enum"
    | "id"
    | undefined,
) {
  switch (fieldType) {
    case "id":
      return AtSignIcon;
    case "number":
      return HashIcon;
    case "date":
      return CalendarIcon;
    case "boolean":
      return CheckIcon;
    case "enum":
      return CircleDotIcon;
    case "multi_enum":
      return ListFilterIcon;
    case "text":
    default:
      return TypeIcon;
  }
}

export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchValueChange,
  filters,
  onFiltersChange,
  filterFields,
  searchPlaceholder = "Cerca...",
  groupOptions = [],
  savedViews = [],
  activeViewId = null,
  onSaveCurrentView,
  onApplySavedView,
  onDeleteSavedView,
  enableGrouping = true,
  compactControls = false,
  onApplyFilters,
  hasPendingFilters = false,
}: DataTableToolbarProps<TData>) {
  const [viewName, setViewName] = React.useState("");
  const sortableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort());
  const resolvedGroupOptions = groupOptions;

  const sorting = table.getState().sorting;
  const grouping = table.getState().grouping;
  const activeConditionCount = countConditions(filters);
  const canAddSort = sorting.length < sortableColumns.length;
  const canAddGroup = grouping.length < resolvedGroupOptions.length;

  const sortedSavedViews = React.useMemo(() => {
    return [...savedViews].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [savedViews]);
  const filterFieldByValue = React.useMemo(
    () => new Map(filterFields.map((field) => [field.value, field])),
    [filterFields],
  );

  function upsertSort(index: number, partial: { id?: string; desc?: boolean }) {
    const next: SortingState = [...sorting];
    const current = next[index];
    if (!current) return;
    const nextId = partial.id ?? current.id;
    const isDuplicate = next.some(
      (item, currentIndex) => currentIndex !== index && item.id === nextId,
    );
    if (isDuplicate) return;
    next[index] = {
      id: nextId,
      desc: partial.desc ?? current.desc,
    };
    table.setSorting(next);
  }

  function addSort() {
    const used = new Set(sorting.map((item) => item.id));
    const firstColumn = sortableColumns.find(
      (column) => !used.has(column.id),
    )?.id;
    if (!firstColumn) return;
    table.setSorting([...sorting, { id: firstColumn, desc: false }]);
  }

  function removeSort(index: number) {
    table.setSorting(
      sorting.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  function addGroup() {
    const used = new Set(grouping);
    const firstGroup = resolvedGroupOptions.find(
      (option) => !used.has(option.value),
    )?.value;
    if (!firstGroup) return;
    table.setGrouping([...grouping, firstGroup]);
  }

  function updateGroup(index: number, value: string) {
    const isDuplicate = grouping.some(
      (currentValue, currentIndex) =>
        currentIndex !== index && currentValue === value,
    );
    if (isDuplicate) return;

    const next = [...grouping];
    if (!next[index]) return;
    next[index] = value;
    table.setGrouping(next);
  }

  function removeGroup(index: number) {
    table.setGrouping(
      grouping.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={
          compactControls
            ? "flex flex-col gap-2"
            : "flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        }
      >
        <Input
          className={compactControls ? "w-full" : "w-full md:max-w-sm"}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
        />

        <div
          className={
            compactControls
              ? "flex items-center gap-2 overflow-x-auto"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={compactControls ? "icon-sm" : "default"}
                className={compactControls ? "relative" : undefined}
                title="Preferiti"
                aria-label={`Preferiti (${savedViews.length})`}
              >
                <BookmarkIcon />
                {compactControls ? (
                  <span className="bg-muted text-muted-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px] leading-4">
                    {savedViews.length}
                  </span>
                ) : (
                  <>Preferiti ({savedViews.length})</>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-[min(92vw,460px)] p-0"
            >
              <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">Viste salvate</div>
              </div>

              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                    placeholder="Nome vista..."
                    className="h-9"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSaveCurrentView?.(viewName);
                      setViewName("");
                    }}
                  >
                    <SaveIcon />
                    Salva
                  </Button>
                </div>

                {sortedSavedViews.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Nessuna vista salvata.
                  </p>
                ) : (
                  <div className="max-h-[260px] space-y-2 overflow-y-auto">
                    {sortedSavedViews.map((view) => (
                      <div
                        key={view.id}
                        className="bg-background flex items-center justify-between rounded-md border px-2 py-1.5"
                      >
                        <button
                          type="button"
                          className="text-left text-sm"
                          onClick={() => onApplySavedView?.(view.id)}
                        >
                          <span
                            className={
                              activeViewId === view.id
                                ? "font-medium"
                                : undefined
                            }
                          >
                            {view.name}
                          </span>
                        </button>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onApplySavedView?.(view.id)}
                          >
                            <BookmarkIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDeleteSavedView?.(view.id)}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={compactControls ? "icon-sm" : "default"}
                className={compactControls ? "relative" : undefined}
                title="Sort by"
                aria-label={`Sort by (${sorting.length})`}
              >
                {compactControls ? <ArrowUpDownIcon /> : null}
                {compactControls ? (
                  <span className="bg-muted text-muted-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px] leading-4">
                    {sorting.length}
                  </span>
                ) : (
                  <>Sort by ({sorting.length})</>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-[min(92vw,700px)] p-0"
            >
              <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">Sort by</div>
              </div>
              <div className="space-y-3 px-4 py-3">
                {sorting.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Nessun ordinamento attivo.
                  </p>
                ) : (
                  sorting.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex items-center gap-2"
                    >
                      {(() => {
                        const usedByOthers = new Set(
                          sorting
                            .filter((_, currentIndex) => currentIndex !== index)
                            .map((entry) => entry.id),
                        );
                        const allowedColumns = sortableColumns.filter(
                          (column) => !usedByOthers.has(column.id),
                        );

                        return (
                          <Select
                            value={item.id}
                            onValueChange={(value) =>
                              upsertSort(index, { id: value })
                            }
                          >
                            <SelectTrigger className="h-10 flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedColumns.map((column) => (
                                <SelectItem key={column.id} value={column.id}>
                                  <span className="flex items-center gap-2">
                                    {(() => {
                                      const field = filterFieldByValue.get(column.id);
                                      const Icon = getFieldTypeIcon(field?.type);
                                      return (
                                        <Icon className="text-muted-foreground size-3.5 shrink-0" />
                                      );
                                    })()}
                                    <span>{getColumnLabel(column)}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}

                      <Select
                        value={item.desc ? "desc" : "asc"}
                        onValueChange={(value) =>
                          upsertSort(index, { desc: value === "desc" })
                        }
                      >
                        <SelectTrigger className="h-10 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">1 - 9</SelectItem>
                          <SelectItem value="desc">9 - 1</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeSort(index)}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addSort}
                  disabled={!canAddSort}
                >
                  <PlusIcon />
                  Add another sort
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {enableGrouping ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Group by ({grouping.length})</Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                className="w-[min(92vw,560px)] p-0"
              >
                <div className="border-b px-4 py-3">
                  <div className="text-sm font-medium">Group by</div>
                </div>
                <div className="space-y-3 px-4 py-3">
                  {grouping.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Nessun raggruppamento attivo.
                    </p>
                  ) : (
                    grouping.map((value, index) => (
                      <div
                        key={`${value}-${index}`}
                        className="flex items-center gap-2"
                      >
                        {(() => {
                          const usedByOthers = new Set(
                            grouping.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          );
                          const allowedGroups = resolvedGroupOptions.filter(
                            (option) => !usedByOthers.has(option.value),
                          );

                          return (
                            <Select
                              value={value}
                              onValueChange={(nextValue) =>
                                updateGroup(index, nextValue)
                              }
                            >
                              <SelectTrigger className="h-10 flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedGroups.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    <span className="flex items-center gap-2">
                                      {(() => {
                                        const field = filterFieldByValue.get(option.value);
                                        const Icon = getFieldTypeIcon(field?.type);
                                        return (
                                          <Icon className="text-muted-foreground size-3.5 shrink-0" />
                                        );
                                      })()}
                                      <span>{option.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeGroup(index)}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    ))
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addGroup}
                    disabled={!canAddGroup}
                  >
                    <PlusIcon />
                    Add another group
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={compactControls ? "icon-sm" : "default"}
                className={compactControls ? "relative" : undefined}
                title="Filtri avanzati"
                aria-label={`Filtri avanzati (${activeConditionCount})`}
              >
                {compactControls ? <ListFilterIcon /> : null}
                {compactControls ? (
                  <span className="bg-muted text-muted-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px] leading-4">
                    {activeConditionCount}
                  </span>
                ) : (
                  <>Filtri avanzati ({activeConditionCount})</>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-[min(92vw,760px)] p-0"
            >
              <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">Filtri avanzati</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Regole e gruppi in overlay, senza espandere la pagina.
                </p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
                <DataTableFilterBuilder
                  fields={filterFields}
                  group={filters}
                  onChange={onFiltersChange}
                />
              </div>
              {onApplyFilters ? (
                <div className="border-t px-4 py-3">
                  <Button
                    variant={hasPendingFilters ? "default" : "outline"}
                    size="sm"
                    onClick={onApplyFilters}
                    disabled={!hasPendingFilters}
                  >
                    Applica filtri
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
