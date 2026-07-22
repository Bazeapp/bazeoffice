import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "../types"
import {
  isArchivioStatus,
  isCandidatiStatus,
  isColloquiStatus,
  isDaColloquiareStatus,
  normalizeStatusToken,
} from "./pipeline-status-utils"

export function buildGroupColors(columns: RicercaWorkerSelectionColumn[]) {
  const groupColors: Record<string, string | null> = {}

  for (const column of columns) {
    groupColors[normalizeStatusToken(column.id)] = column.color
    groupColors[normalizeStatusToken(column.label)] = column.color
  }

  return groupColors
}

export function buildGroupStatusIds(columns: RicercaWorkerSelectionColumn[]) {
  const groupStatusIds: Record<string, string> = {}

  for (const column of columns) {
    const canonicalId = column.id
    groupStatusIds[normalizeStatusToken(column.id)] = canonicalId
    groupStatusIds[normalizeStatusToken(column.label)] = canonicalId
  }

  return groupStatusIds
}

export function resolvePreferredDropStatusId(
  columns: RicercaWorkerSelectionColumn[],
  preferredToken: string,
  fallback: string,
) {
  const normalizedPreferred = normalizeStatusToken(preferredToken)
  const preferred = columns.find(
    (column) =>
      normalizeStatusToken(column.id) === normalizedPreferred ||
      normalizeStatusToken(column.label) === normalizedPreferred,
  )
  return preferred?.id ?? fallback
}

export function getWorkerCertificationRank(worker: LavoratoreListItem) {
  if (worker.isCertificato) return 0
  if (worker.isIdoneo) return 1
  return 2
}

export function getTravelTimeSortValue(worker: LavoratoreListItem) {
  const travelTime = worker.travelTimeMinutes
  return typeof travelTime === "number" && Number.isFinite(travelTime)
    ? travelTime
    : Number.MAX_SAFE_INTEGER
}

export function sortWorkerSelectionCards(cards: RicercaWorkerSelectionCard[]) {
  return [...cards].sort((a, b) => {
    const certificationDelta =
      getWorkerCertificationRank(a.worker) - getWorkerCertificationRank(b.worker)
    if (certificationDelta !== 0) return certificationDelta

    const travelTimeDelta =
      getTravelTimeSortValue(a.worker) - getTravelTimeSortValue(b.worker)
    if (travelTimeDelta !== 0) return travelTimeDelta

    return a.worker.nomeCompleto.localeCompare(b.worker.nomeCompleto, "it")
  })
}

export function sortWorkerSelectionColumns(columns: RicercaWorkerSelectionColumn[]) {
  return columns.map((column) => ({
    ...column,
    cards: sortWorkerSelectionCards(column.cards),
  }))
}

export function getDotColorClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "bg-red-500"
    case "rose":
      return "bg-rose-500"
    case "orange":
      return "bg-orange-500"
    case "amber":
      return "bg-amber-500"
    case "yellow":
      return "bg-yellow-500"
    case "lime":
      return "bg-lime-500"
    case "green":
      return "bg-green-500"
    case "emerald":
      return "bg-emerald-500"
    case "teal":
      return "bg-teal-500"
    case "cyan":
      return "bg-cyan-500"
    case "sky":
      return "bg-sky-500"
    case "blue":
      return "bg-blue-500"
    case "indigo":
      return "bg-indigo-500"
    case "violet":
      return "bg-violet-500"
    case "purple":
      return "bg-purple-500"
    case "fuchsia":
      return "bg-fuchsia-500"
    case "pink":
      return "bg-pink-500"
    case "slate":
    case "gray":
    case "zinc":
    case "neutral":
    case "stone":
      return "bg-zinc-500"
    default:
      return "bg-sky-500"
  }
}

export function mergeGroupedPipelineColumns(
  baseColumns: RicercaWorkerSelectionColumn[],
): RicercaWorkerSelectionColumn[] {
  const candidateColumns = baseColumns.filter(
    (column) => isCandidatiStatus(column.id) || isCandidatiStatus(column.label),
  )
  let nextColumns = baseColumns

  if (candidateColumns.length > 0) {
    const firstCandidateIndex = nextColumns.findIndex((column) =>
      candidateColumns.some((candidate) => candidate.id === column.id),
    )

    const mergedCandidatiColumn: RicercaWorkerSelectionColumn = {
      id: "__candidati__",
      label: "Candidati",
      color: "sky",
      dropStatusId: resolvePreferredDropStatusId(
        candidateColumns,
        "prospetto",
        "Prospetto",
      ),
      groupColors: buildGroupColors(candidateColumns),
      groupStatusIds: buildGroupStatusIds(candidateColumns),
      cards: candidateColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !candidateColumns.some((candidate) => candidate.id === column.id),
    )
    nextColumns.splice(Math.max(0, firstCandidateIndex), 0, mergedCandidatiColumn)
  }

  const daColloquiareColumns = nextColumns.filter(
    (column) =>
      isDaColloquiareStatus(column.id) || isDaColloquiareStatus(column.label),
  )
  if (daColloquiareColumns.length > 0) {
    const firstDaColloquiareIndex = nextColumns.findIndex((column) =>
      daColloquiareColumns.some((grouped) => grouped.id === column.id),
    )

    const mergedDaColloquiareColumn: RicercaWorkerSelectionColumn = {
      id: "__da_colloquiare__",
      label: "Da colloquiare",
      color:
        daColloquiareColumns.find(
          (column) => normalizeStatusToken(column.label) === "da colloquiare",
        )?.color ?? "indigo",
      dropStatusId: resolvePreferredDropStatusId(
        daColloquiareColumns,
        "da colloquiare",
        "Da colloquiare",
      ),
      groupColors: buildGroupColors(daColloquiareColumns),
      groupStatusIds: buildGroupStatusIds(daColloquiareColumns),
      cards: daColloquiareColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !daColloquiareColumns.some((grouped) => grouped.id === column.id),
    )
    nextColumns.splice(
      Math.max(0, firstDaColloquiareIndex),
      0,
      mergedDaColloquiareColumn,
    )
  }

  const archivioColumns = nextColumns.filter(
    (column) => isArchivioStatus(column.id) || isArchivioStatus(column.label),
  )
  if (archivioColumns.length > 0) {
    const mergedArchivioColumn: RicercaWorkerSelectionColumn = {
      id: "__archivio__",
      label: "Scartati",
      color: "muted",
      dropStatusId: resolvePreferredDropStatusId(
        archivioColumns,
        "archivio",
        "Archivio",
      ),
      groupColors: buildGroupColors(archivioColumns),
      groupStatusIds: buildGroupStatusIds(archivioColumns),
      cards: archivioColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !archivioColumns.some((archivio) => archivio.id === column.id),
    )
    nextColumns.push(mergedArchivioColumn)
  }

  const colloquiColumns = nextColumns.filter(
    (column) => isColloquiStatus(column.id) || isColloquiStatus(column.label),
  )
  if (colloquiColumns.length > 0) {
    const firstColloquiIndex = nextColumns.findIndex((column) =>
      colloquiColumns.some((colloquio) => colloquio.id === column.id),
    )

    const mergedColloquiColumn: RicercaWorkerSelectionColumn = {
      id: "__colloqui_prove__",
      label: "Colloqui / Prove",
      color: "green",
      dropStatusId: resolvePreferredDropStatusId(
        colloquiColumns,
        "colloquio schedulato",
        "Colloquio schedulato",
      ),
      groupColors: buildGroupColors(colloquiColumns),
      groupStatusIds: buildGroupStatusIds(colloquiColumns),
      cards: colloquiColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !colloquiColumns.some((colloquio) => colloquio.id === column.id),
    )
    nextColumns.splice(Math.max(0, firstColloquiIndex), 0, mergedColloquiColumn)
  }

  return sortWorkerSelectionColumns(nextColumns)
}
