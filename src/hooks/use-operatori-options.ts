import * as React from "react"

import { invokeEdgeFunction } from "@/lib/supabase-edge"

type GenericRow = Record<string, unknown>
type TableQueryResponse = GenericRow[] | { data?: GenericRow[]; rows?: GenericRow[] }

export type OperatoreOption = {
  id: string
  label: string
  avatar: string
  avatarBorderClassName: string
}

type UseOperatoriOptionsParams = {
  role?: string
  activeOnly?: boolean
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function getAvatarBorderClass(seed: string) {
  const variants = [
    "after:border-emerald-500",
    "after:border-sky-500",
    "after:border-violet-500",
    "after:border-amber-500",
    "after:border-rose-500",
    "after:border-cyan-500",
  ]
  return variants[hashString(seed) % variants.length] ?? variants[0]
}

function buildAvatar(nome: string, cognome: string) {
  const initials = [nome, cognome]
    .filter(Boolean)
    .map((part) => part.trim()[0]?.toUpperCase() ?? "")
    .join("")

  return initials || nome.trim()[0]?.toUpperCase() || "?"
}

function normalizeRole(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_")
}

function hasRole(row: GenericRow, role: string | undefined) {
  if (!role) return true
  const rawRole = row.ruolo
  if (!Array.isArray(rawRole)) return false
  const normalizedRole = normalizeRole(role)
  return rawRole.some(
    (item) =>
      typeof item === "string" && normalizeRole(item) === normalizedRole
  )
}

function isActive(row: GenericRow, activeOnly: boolean) {
  if (!activeOnly) return true
  return row.attivo === true
}

export function useOperatoriOptions(params: UseOperatoriOptionsParams = {}) {
  const role = params.role ? normalizeRole(params.role) : undefined
  const activeOnly = params.activeOnly ?? false
  const [options, setOptions] = React.useState<OperatoreOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const rows = await invokeEdgeFunction<TableQueryResponse>("table-query", {
          table: "operatori",
          select: ["id", "nome", "cognome", "ruolo", "attivo"],
          orderBy: [
            { field: "nome", ascending: true },
            { field: "cognome", ascending: true },
          ],
          filters: {
            kind: "group",
            id: "operatori-options-root",
            logic: "and",
            nodes: [
              ...(activeOnly
                ? [
                    {
                      kind: "condition",
                      id: "operatori-options-attivo",
                      field: "attivo",
                      operator: "is_true",
                      value: "",
                    },
                  ]
                : []),
              ...(role
                ? [
                    {
                      kind: "condition",
                      id: "operatori-options-role",
                      field: "ruolo",
                      operator: "has",
                      value: role,
                    },
                  ]
                : []),
            ],
          },
        })

        const rawRows = Array.isArray(rows) ? rows : rows.data ?? rows.rows ?? []
        let filteredRows = rawRows.filter(
          (row) => isActive(row, activeOnly) && hasRole(row, role)
        )

        if (role && activeOnly && filteredRows.length === 0) {
          filteredRows = rawRows.filter((row) => isActive(row, activeOnly))
        }

        const nextOptions = filteredRows
          .map((row) => {
            const id = toStringValue(row.id)
            const nome = toStringValue(row.nome) ?? ""
            const cognome = toStringValue(row.cognome) ?? ""
            if (!id || !nome) return null

            return {
              id,
              label: [nome, cognome].filter(Boolean).join(" "),
              avatar: buildAvatar(nome, cognome),
              avatarBorderClassName: getAvatarBorderClass(id),
            } satisfies OperatoreOption
          })
          .filter((option): option is OperatoreOption => Boolean(option))

        if (cancelled) return
        setOptions(nextOptions)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando operatori"
        )
        setOptions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeOnly, role])

  return {
    options,
    loading,
    error,
  }
}
