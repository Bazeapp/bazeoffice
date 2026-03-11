import * as React from "react"
import type { GroupingState, SortingState } from "@tanstack/react-table"

import { createEmptyGroup, type FilterGroup } from "@/components/data-table/data-table-filters"

export type TableQueryState = {
  searchValue: string
  filters: FilterGroup
  sorting: SortingState
  grouping: GroupingState
}

export type SavedTableQueryView = {
  id: string
  name: string
  searchValue: string
  filters: FilterGroup
  sorting: SortingState
  grouping: GroupingState
  createdAt: string
  updatedAt: string
}

type UseTableQueryStateOptions = {
  initialQuery?: Partial<TableQueryState>
  viewsStorageKey?: string
  debounceMs?: number
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function isValidSavedTableView(value: unknown): value is SavedTableQueryView {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<SavedTableQueryView>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.searchValue === "string" &&
    Array.isArray(candidate.sorting) &&
    Array.isArray(candidate.grouping) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    Boolean(candidate.filters && typeof candidate.filters === "object")
  )
}

function getQuerySignature(query: TableQueryState) {
  return JSON.stringify(query)
}

function createInitialQuery(initial?: Partial<TableQueryState>): TableQueryState {
  return {
    searchValue: initial?.searchValue ?? "",
    filters: initial?.filters ?? createEmptyGroup("and"),
    sorting: initial?.sorting ?? [],
    grouping: initial?.grouping ?? [],
  }
}

function getFiltersSignature(filters: FilterGroup) {
  return JSON.stringify(filters)
}

function createViewId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useTableQueryState({
  initialQuery,
  viewsStorageKey,
  debounceMs = 700,
}: UseTableQueryStateOptions = {}) {
  const [searchValue, setSearchValue] = React.useState(
    () => initialQuery?.searchValue ?? ""
  )
  const [filters, setFilters] = React.useState<FilterGroup>(
    () => initialQuery?.filters ?? createEmptyGroup("and")
  )
  const [appliedFilters, setAppliedFilters] = React.useState<FilterGroup>(
    () => initialQuery?.filters ?? createEmptyGroup("and")
  )
  const [sorting, setSorting] = React.useState<SortingState>(() => initialQuery?.sorting ?? [])
  const [grouping, setGrouping] = React.useState<GroupingState>(
    () => initialQuery?.grouping ?? []
  )
  const [debouncedQuery, setDebouncedQuery] = React.useState<TableQueryState>(() =>
    createInitialQuery(initialQuery)
  )
  const [savedViews, setSavedViews] = React.useState<SavedTableQueryView[]>([])
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null)
  const didLoadSavedViewsRef = React.useRef(false)
  const applyingSavedViewRef = React.useRef(false)
  const lastDebouncedSignatureRef = React.useRef<string>("")

  const query = React.useMemo<TableQueryState>(
    () => ({ searchValue, filters: appliedFilters, sorting, grouping }),
    [appliedFilters, grouping, searchValue, sorting]
  )

  React.useEffect(() => {
    if (!initialQuery) return
    setSearchValue(initialQuery.searchValue ?? "")
    setFilters(initialQuery.filters ?? createEmptyGroup("and"))
    setAppliedFilters(initialQuery.filters ?? createEmptyGroup("and"))
    setSorting(initialQuery.sorting ?? [])
    setGrouping(initialQuery.grouping ?? [])
  }, [initialQuery])

  React.useEffect(() => {
    const nextSignature = getQuerySignature(query)
    if (lastDebouncedSignatureRef.current === nextSignature) return

    const timeout = window.setTimeout(() => {
      lastDebouncedSignatureRef.current = nextSignature
      setDebouncedQuery(query)
    }, Math.max(0, debounceMs))

    return () => {
      window.clearTimeout(timeout)
    }
  }, [debounceMs, query])

  React.useEffect(() => {
    didLoadSavedViewsRef.current = false

    if (!viewsStorageKey || typeof window === "undefined") {
      setSavedViews([])
      setActiveViewId(null)
      didLoadSavedViewsRef.current = true
      return
    }

    try {
      const raw = window.localStorage.getItem(viewsStorageKey)
      if (!raw) {
        setSavedViews([])
        setActiveViewId(null)
        didLoadSavedViewsRef.current = true
        return
      }

      const parsed = JSON.parse(raw) as unknown
      const loaded = Array.isArray(parsed)
        ? parsed.filter((item): item is SavedTableQueryView => isValidSavedTableView(item))
        : []

      setSavedViews(loaded)
      setActiveViewId((previous) =>
        loaded.some((view) => view.id === previous) ? previous : null
      )
    } catch {
      setSavedViews([])
      setActiveViewId(null)
    } finally {
      didLoadSavedViewsRef.current = true
    }
  }, [viewsStorageKey])

  React.useEffect(() => {
    if (!viewsStorageKey || typeof window === "undefined") return
    if (!didLoadSavedViewsRef.current) return

    window.localStorage.setItem(viewsStorageKey, JSON.stringify(savedViews))
  }, [savedViews, viewsStorageKey])

  React.useEffect(() => {
    if (!activeViewId) return
    if (applyingSavedViewRef.current) {
      applyingSavedViewRef.current = false
      return
    }

    setActiveViewId(null)
  }, [activeViewId, filters, grouping, searchValue, sorting])

  const getDefaultViewName = React.useCallback(() => {
    let index = savedViews.length + 1
    while (savedViews.some((view) => view.name.toLowerCase() === `vista ${index}`)) {
      index += 1
    }
    return `Vista ${index}`
  }, [savedViews])

  const saveView = React.useCallback(
    (name: string) => {
      const normalizedName = name.trim() || getDefaultViewName()
      const existing = savedViews.find(
        (view) => view.name.toLowerCase() === normalizedName.toLowerCase()
      )
      const now = new Date().toISOString()

      if (existing) {
        const updated: SavedTableQueryView = {
          ...existing,
          name: normalizedName,
          searchValue,
          filters: cloneSerializable(filters),
          sorting: cloneSerializable(sorting),
          grouping: cloneSerializable(grouping),
          updatedAt: now,
        }

        setSavedViews((previous) =>
          previous.map((view) => (view.id === existing.id ? updated : view))
        )
        setActiveViewId(existing.id)
        return { mode: "updated" as const, view: updated }
      }

      const nextView: SavedTableQueryView = {
        id: createViewId(),
        name: normalizedName,
        searchValue,
        filters: cloneSerializable(filters),
        sorting: cloneSerializable(sorting),
        grouping: cloneSerializable(grouping),
        createdAt: now,
        updatedAt: now,
      }

      setSavedViews((previous) => [...previous, nextView])
      setActiveViewId(nextView.id)
      return { mode: "created" as const, view: nextView }
    },
    [filters, getDefaultViewName, grouping, savedViews, searchValue, sorting]
  )

  const applyView = React.useCallback(
    (id: string) => {
      const view = savedViews.find((candidate) => candidate.id === id)
      if (!view) return null

      applyingSavedViewRef.current = true
      setSearchValue(view.searchValue)
      setFilters(cloneSerializable(view.filters))
      setAppliedFilters(cloneSerializable(view.filters))
      setSorting(cloneSerializable(view.sorting))
      setGrouping(cloneSerializable(view.grouping))
      setActiveViewId(view.id)
      return view
    },
    [savedViews]
  )

  const deleteView = React.useCallback(
    (id: string) => {
      const target = savedViews.find((view) => view.id === id)
      if (!target) return null

      setSavedViews((previous) => previous.filter((view) => view.id !== id))
      setActiveViewId((previous) => (previous === id ? null : previous))
      return target
    },
    [savedViews]
  )

  const hasPendingFilters = React.useMemo(() => {
    return getFiltersSignature(filters) !== getFiltersSignature(appliedFilters)
  }, [appliedFilters, filters])

  const applyFilters = React.useCallback(() => {
    setAppliedFilters(cloneSerializable(filters))
  }, [filters])

  return {
    query,
    debouncedQuery,
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    appliedFilters,
    hasPendingFilters,
    applyFilters,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    savedViews,
    activeViewId,
    setActiveViewId,
    saveView,
    applyView,
    deleteView,
  }
}
