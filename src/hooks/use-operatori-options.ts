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

export function useOperatoriOptions() {
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
          select: ["id", "nome", "cognome"],
          orderBy: [
            { field: "nome", ascending: true },
            { field: "cognome", ascending: true },
          ],
        })

        const rawRows = Array.isArray(rows) ? rows : rows.data ?? rows.rows ?? []
        const nextOptions = rawRows
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
  }, [])

  return {
    options,
    loading,
    error,
  }
}
