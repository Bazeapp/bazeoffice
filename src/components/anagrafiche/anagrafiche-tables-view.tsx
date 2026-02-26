import type { ColumnDef } from "@tanstack/react-table"
import * as React from "react"

import { DataTable } from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type AnagraficheTab,
  type AnagraficaRow,
  type LookupColorMap,
  useAnagraficheData,
} from "@/hooks/use-anagrafiche-data"

type TabValue = AnagraficheTab
type PaginationState = {
  pageIndex: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 50
const UPPERCASE_TOKENS = new Set([
  "id",
  "url",
  "utm",
  "otp",
  "seo",
  "wa",
  "fbclid",
  "gclid",
  "cet",
  "ai",
  "inps",
  "cud",
  "json",
  "jsonb",
  "uuid",
])
const LOWERCASE_CONNECTORS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "con",
  "da",
  "dal",
  "dalla",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "e",
  "il",
  "in",
  "la",
  "le",
  "nel",
  "nella",
  "o",
  "per",
  "su",
  "tra",
])
const TOKEN_LABEL_OVERRIDES: Record<string, string> = {
  whatsapp: "WhatsApp",
  webflow: "Webflow",
  looker: "Looker",
  stripe: "Stripe",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  typeform: "Typeform",
  wized: "Wized",
  klaaryo: "Klaaryo",
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function toReadableColumnLabel(key: string) {
  const normalized = key.replace(/__+/g, "_").trim()
  if (!normalized) return key

  const parts = normalized
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return key

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (TOKEN_LABEL_OVERRIDES[lower]) {
        return TOKEN_LABEL_OVERRIDES[lower]
      }

      if (UPPERCASE_TOKENS.has(lower)) {
        return lower.toUpperCase()
      }

      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
        return lower
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function resolveLookupColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  rawValue: unknown
) {
  if (typeof rawValue !== "string" || !rawValue.trim()) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(rawValue)] ?? null
}

function formatArrayItem(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") return "[oggetto]"
  return String(value)
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (!value.length) return "-"
    const preview = value.slice(0, 3).map((item) => formatArrayItem(item)).join(", ")
    if (value.length <= 3) return preview
    return `${preview}, +${value.length - 3}`
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
    if (!keys.length) return "{}"
    const preview = keys.slice(0, 3).join(", ")
    if (keys.length <= 3) return `{ ${preview} }`
    return `{ ${preview}, +${keys.length - 3} }`
  }
  return String(value)
}

function getOrderedKeys(rows: AnagraficaRow[]) {
  const keys: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      keys.push(key)
    }
  }

  return keys
}

function toFieldOptions(rows: AnagraficaRow[]) {
  const keys = getOrderedKeys(rows)

  return keys.map((key) => {
    const uniqueValues = new Set<string>()

    for (const row of rows) {
      const value = row[key]
      if (value === null || value === undefined) continue

      let normalized = ""
      if (typeof value === "string") {
        normalized = value.trim()
      } else if (typeof value === "number" || typeof value === "boolean") {
        normalized = String(value)
      } else if (Array.isArray(value)) {
        normalized = value
          .map((item) => (item === null || item === undefined ? "" : String(item)))
          .filter(Boolean)
          .join(", ")
      } else {
        try {
          normalized = JSON.stringify(value)
        } catch {
          normalized = String(value)
        }
      }

      if (!normalized) continue
      uniqueValues.add(normalized)
      if (uniqueValues.size >= 50) break
    }

    return {
      label: toReadableColumnLabel(key),
      value: key,
      options: Array.from(uniqueValues)
        .sort((a, b) => a.localeCompare(b))
        .map((option) => ({
          label: option,
          value: option,
        })),
    }
  })
}

function buildColumns(
  rows: AnagraficaRow[],
  entityTable: "famiglie" | "processi_matching" | "lavoratori",
  lookupColors: LookupColorMap
): ColumnDef<AnagraficaRow>[] {
  const keys = getOrderedKeys(rows)

  return keys.map((key) => ({
    accessorKey: key,
    header: toReadableColumnLabel(key),
    cell: ({ row }) => {
      const rawValue = row.original[key]
      const color = resolveLookupColor(lookupColors, entityTable, key, rawValue)
      const renderedValue = formatCellValue(rawValue)

      if (color && typeof renderedValue === "string" && renderedValue !== "-") {
        return <Badge className={getBadgeClassName(color)}>{renderedValue}</Badge>
      }

      return renderedValue
    },
  }))
}

type AnagraficheTablesViewProps = {
  activeTab?: TabValue
  onActiveTabChange?: (tab: TabValue) => void
}

export function AnagraficheTablesView({
  activeTab: activeTabProp,
  onActiveTabChange,
}: AnagraficheTablesViewProps = {}) {
  const [internalActiveTab, setInternalActiveTab] = React.useState<TabValue>(
    activeTabProp ?? "famiglie"
  )
  const activeTab = activeTabProp ?? internalActiveTab
  const setActiveTab = React.useCallback(
    (nextTab: TabValue) => {
      if (activeTabProp === undefined) {
        setInternalActiveTab(nextTab)
      }
      onActiveTabChange?.(nextTab)
    },
    [activeTabProp, onActiveTabChange]
  )
  const [paginationByTab, setPaginationByTab] = React.useState<
    Record<TabValue, PaginationState>
  >({
    famiglie: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    processi: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    lavoratori: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  })
  const activePagination = paginationByTab[activeTab]
  const { 
    workers,
    families,
    processes,
    workersTotal,
    familiesTotal,
    processesTotal,
    lookupColors,
    loading,
    error,
  } = useAnagraficheData({
    activeTab,
    pageIndex: activePagination.pageIndex,
    pageSize: activePagination.pageSize,
  })

  const tableConfig = React.useMemo(() => {
    if (activeTab === "processi") {
      return {
        key: "processi",
        columns: buildColumns(processes, "processi_matching", lookupColors),
        data: processes,
        fields: toFieldOptions(processes),
        searchPlaceholder: "Cerca in processi...",
        totalRows: processesTotal,
      }
    }

    if (activeTab === "lavoratori") {
      return {
        key: "lavoratori",
        columns: buildColumns(workers, "lavoratori", lookupColors),
        data: workers,
        fields: toFieldOptions(workers),
        searchPlaceholder: "Cerca in lavoratori...",
        totalRows: workersTotal,
      }
    }

    return {
      key: "famiglie",
      columns: buildColumns(families, "famiglie", lookupColors),
      data: families,
      fields: toFieldOptions(families),
      searchPlaceholder: "Cerca in famiglie...",
      totalRows: familiesTotal,
    }
  }, [
    activeTab,
    families,
    familiesTotal,
    lookupColors,
    processes,
    processesTotal,
    workers,
    workersTotal,
  ])

  function handleTabPaginationChange(next: PaginationState) {
    setPaginationByTab((previous) => ({
      ...previous,
      [activeTab]: next,
    }))
  }

  return (
    <section className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Anagrafiche</h1>
          <p className="text-muted-foreground text-sm">
            Vista tabellare completa con tutte le colonne disponibili.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground rounded-lg border p-4 text-sm">
          Caricamento dati da Supabase...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dati: {error}
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full min-w-0"
      >
        <TabsList variant="default">
          <TabsTrigger value="famiglie">Famiglie</TabsTrigger>
          <TabsTrigger value="processi">Processi</TabsTrigger>
          <TabsTrigger value="lavoratori">Lavoratori</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="min-w-0">
          <DataTable
            key={tableConfig.key}
            columns={tableConfig.columns}
            data={tableConfig.data}
            filterFields={tableConfig.fields}
            groupOptions={tableConfig.fields}
            searchPlaceholder={tableConfig.searchPlaceholder}
            viewsStorageKey={`anagrafiche.${tableConfig.key}.saved-views`}
            pageSize={DEFAULT_PAGE_SIZE}
            manualPagination
            totalRows={tableConfig.totalRows}
            paginationState={activePagination}
            onPaginationStateChange={handleTabPaginationChange}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
