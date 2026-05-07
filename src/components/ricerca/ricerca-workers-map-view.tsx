import * as React from "react"
import * as L from "leaflet"
import { createRoot } from "react-dom/client"
import { toast } from "sonner"
import "leaflet/dist/leaflet.css"

import { LavoratoreCard, type LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import {
  asString,
  asStringArrayFirst,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  toAvatarThumbnailUrl,
  toAvatarUrl,
} from "@/features/lavoratori/lib/base-utils"
import {
  isBlacklistValue,
  normalizeLookupColors,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "@/hooks/use-ricerca-workers-pipeline"
import { useRicercaWorkersPipeline } from "@/hooks/use-ricerca-workers-pipeline"
import {
  createRecord,
  fetchIndirizzi,
  fetchLavoratori,
  fetchLookupValues,
} from "@/lib/anagrafiche-api"
import {
  distanceKmBetweenCoordinates,
  parseCoordinates,
  type GeoCoordinates,
} from "@/lib/geo-utils"
import { cn } from "@/lib/utils"

const DEFAULT_RADIUS_KM = 5
const DEFAULT_MAP_ZOOM = 13
const DISCOVERY_ADDRESS_LIMIT = 1000
const DISCOVERY_WORKER_BATCH_SIZE = 100
const MAP_ACTIONS = [
  { label: "Da colloquiare", status: "Da colloquiare" },
  { label: "Selezionato", status: "Selezionato" },
  { label: "Non selezionato", status: "Non selezionato" },
] as const
const STATUS_FILTER_OPTIONS = ["Qualificato", "Idoneo", "Certificato"] as const
const WORK_DAYS_FILTER_OPTIONS = [
  "Lavori di 1 giorno",
  "Lavori di 2 giorni",
  "Lavori di 3 giorni",
  "Lavori di 4 giorni",
  "Lavori di 5 giorni",
  "Lavori di 6 giorni",
] as const

const COLOR_HEX_BY_TOKEN: Record<string, string> = {
  red: "#ef4444",
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  slate: "#64748b",
  gray: "#6b7280",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
  muted: "#71717a",
}

type RicercaWorkersMapViewProps = {
  processId: string
  searchGeocode?: unknown
  searchMapsEmbed?: unknown
  jobRole?: string | null
  weeklyDays?: string | null
  className?: string
}

type MapWorkerListItem = LavoratoreListItem & {
  checkLavoriAccettabili: string[]
}

type MapWorker = {
  worker: MapWorkerListItem
  selectionId: string | null
  status: string | null
  mapStatus: "unreviewed" | "active" | "discarded"
  column: RicercaWorkerSelectionColumn | null
  coordinates: GeoCoordinates
  color: string
  distanceKm: number | null
}

type MapActionColor = {
  status: string
  color: string
}

type GenericRow = Record<string, unknown>

type DiscoveryWorkerResult = {
  workers: Array<{
    worker: MapWorkerListItem
    coordinates: GeoCoordinates
    distanceKm: number
  }>
  missingCoordinates: number
}

function normalizeStatusToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(",", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function getWorkerRoleFilterValues(jobRole: string | null | undefined) {
  const rawRole = String(jobRole ?? "").trim()
  const roleToken = normalizeStatusToken(rawRole)
  if (!roleToken) return []

  if (roleToken.includes("colf") || roleToken.includes("pulizie")) {
    return uniqueValues([rawRole, "Colf", "Pulizie", "Colf / Pulizie"])
  }

  if (roleToken.includes("badante") || roleToken.includes("assistenza")) {
    return uniqueValues([
      rawRole,
      "Badante",
      "Assistenza domestica / Badante",
      "Assistenza domiciliare / Badante",
    ])
  }

  if (roleToken.includes("baby") || roleToken.includes("tata")) {
    return uniqueValues([rawRole, "Tata", "Babysitter", "Babysitter / Tata-Colf"])
  }

  return [rawRole]
}

function getColorHex(color: string | null | undefined) {
  const token = String(color ?? "").trim().toLowerCase()
  return COLOR_HEX_BY_TOKEN[token] ?? COLOR_HEX_BY_TOKEN.sky
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readAddressCoordinates(address: GenericRow | undefined) {
  if (!address) return null
  const lat = toNumberValue(address.latitudine)
  const lng = toNumberValue(address.longitudine)
  if (lat === null || lng === null) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function formatAddressLabel(address: GenericRow | undefined, worker: GenericRow) {
  if (!address) return asString(worker.cap) || null

  const note = asString(address.note)
  const citta = asString(address.citta)
  const cap = asString(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [shortNote, citta, cap]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
      .join(" • ") || asString(worker.cap) || null
  )
}

function resolveWorkerAddress(
  workerId: string,
  addressesByWorkerId: Map<string, GenericRow[]>
) {
  const addresses = addressesByWorkerId.get(workerId) ?? []
  if (addresses.length === 0) return undefined

  return (
    addresses.find(
      (address) => normalizeStatusToken(asString(address.tipo_indirizzo)) === "residenza"
    ) ??
    addresses.find(
      (address) => normalizeStatusToken(asString(address.tipo_indirizzo)) === "domicilio"
    ) ??
    addresses[0]
  )
}

function isUnavailable(value: string | null | undefined) {
  return normalizeStatusToken(value).includes("non disponibile")
}

function normalizeFilterValues(values: readonly string[]) {
  return values.filter((value) => value.trim().length > 0)
}

function hasAnyNormalizedValue(values: readonly string[], selectedValues: readonly string[]) {
  if (selectedValues.length === 0) return true
  const selectedTokens = new Set(selectedValues.map((value) => normalizeStatusToken(value)))
  return values.some((value) => selectedTokens.has(normalizeStatusToken(value)))
}

function workerMatchesVisibleFilters(
  worker: MapWorkerListItem,
  selectedStatuses: readonly string[],
  selectedWorkDays: readonly string[]
) {
  return (
    hasAnyNormalizedValue(worker.statoLavoratore ? [worker.statoLavoratore] : [], selectedStatuses) &&
    hasAnyNormalizedValue(worker.checkLavoriAccettabili, selectedWorkDays)
  )
}

function defaultWorkDaysFromSearch(value: string | null | undefined) {
  const match = String(value ?? "").match(/\d+/)
  if (!match) return [] as string[]

  const label = `Lavori di ${match[0]} giorni`
  return WORK_DAYS_FILTER_OPTIONS.includes(
    label as (typeof WORK_DAYS_FILTER_OPTIONS)[number]
  )
    ? [label]
    : []
}

function toggleFilterValue(values: string[], value: string, checked: boolean) {
  if (checked) {
    return values.includes(value) ? values : [...values, value]
  }

  return values.filter((item) => item !== value)
}

function buildDiscoveryWorkerListItem(
  worker: GenericRow,
  lookupColorsByDomain: Map<string, string>,
  addressesByWorkerId: Map<string, GenericRow[]>
): MapWorkerListItem {
  const workerId = asString(worker.id) || "unknown-worker"
  const nome = asString(worker.nome)
  const cognome = asString(worker.cognome)
  const statoLavoratore = asString(worker.stato_lavoratore) || null
  const disponibilita = asString(worker.disponibilita) || null
  const statusFlags = toWorkerStatusFlags(statoLavoratore)
  const ruoliDomestici = normalizeDomesticRoleLabels(readArrayStrings(worker.tipo_lavoro_domestico))
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavoro = asStringArrayFirst(worker.tipo_rapporto_lavorativo) || null
  const workerAddress = resolveWorkerAddress(workerId, addressesByWorkerId)
  const disponibilitaToken = normalizeStatusToken(disponibilita)
  const isDisponibile =
    disponibilitaToken.length === 0
      ? null
      : disponibilitaToken.includes("non disponibile") ||
          disponibilitaToken.includes("non idone")
        ? false
        : disponibilitaToken.includes("disponib")
          ? true
          : null

  return {
    id: workerId,
    nomeCompleto: `${nome} ${cognome}`.trim() || workerId,
    immagineUrl: toAvatarThumbnailUrl(worker) ?? toAvatarUrl(worker) ?? getDefaultWorkerAvatar(workerId),
    travelTimeMinutes: null,
    locationLabel: formatAddressLabel(workerAddress, worker),
    telefono: asString(worker.telefono) || null,
    isBlacklisted: isBlacklistValue(worker.check_blacklist),
    tipoRuolo,
    tipoRuoloColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_lavoro_domestico",
      tipoRuolo
    ),
    tipoLavoro,
    tipoLavoroColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_rapporto_lavorativo",
      tipoLavoro
    ),
    ruoliDomestici,
    eta: getAgeFromBirthDate(worker.data_di_nascita),
    anniEsperienzaColf: toNumberValue(worker.anni_esperienza_colf),
    anniEsperienzaBabysitter: toNumberValue(worker.anni_esperienza_babysitter),
    statoLavoratore,
    statoLavoratoreColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.stato_lavoratore",
      statoLavoratore
    ),
    disponibilita,
    disponibilitaColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.disponibilita",
      disponibilita
    ),
    coordinates: readAddressCoordinates(workerAddress),
    isDisponibile,
    isQualified: statusFlags.isQualified,
    isIdoneo: statusFlags.isIdoneo,
    isCertificato: statusFlags.isCertificato,
    otherActiveSelections: null,
    checkLavoriAccettabili: readArrayStrings(worker.check_lavori_accettabili),
  }
}

function resolveTargetStatusColor(
  columns: RicercaWorkerSelectionColumn[],
  targetStatus: string
) {
  const targetToken = normalizeStatusToken(targetStatus)

  for (const column of columns) {
    const groupColor = column.groupColors?.[targetToken]
    if (groupColor) return getColorHex(groupColor)

    const groupStatusId = column.groupStatusIds?.[targetToken]
    if (groupStatusId) {
      const groupStatusColor =
        column.groupColors?.[normalizeStatusToken(groupStatusId)] ?? column.color
      return getColorHex(groupStatusColor)
    }

    if (
      normalizeStatusToken(column.id) === targetToken ||
      normalizeStatusToken(column.label) === targetToken ||
      normalizeStatusToken(column.dropStatusId) === targetToken
    ) {
      return getColorHex(column.color)
    }
  }

  return getColorHex(null)
}

function isDiscardedColumn(column: RicercaWorkerSelectionColumn | null) {
  if (!column) return false
  const columnToken = normalizeStatusToken(column.id)
  const labelToken = normalizeStatusToken(column.label)
  return columnToken === "__archivio__" || labelToken === "scartati"
}

function getBoundingBox(center: GeoCoordinates, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.15))

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  }
}

async function fetchDiscoveryWorkerAddresses(searchCoordinates: GeoCoordinates) {
  const bounds = getBoundingBox(searchCoordinates, DEFAULT_RADIUS_KM)

  const result = await fetchIndirizzi({
    select: [
      "entita_id",
      "tipo_indirizzo",
      "cap",
      "citta",
      "note",
      "latitudine",
      "longitudine",
    ],
    limit: DISCOVERY_ADDRESS_LIMIT,
    offset: 0,
    orderBy: [{ field: "aggiornato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "map-discovery-addresses-root",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "map-discovery-addresses-table",
          field: "entita_tabella",
          operator: "is",
          value: "lavoratori",
        },
        {
          kind: "condition",
          id: "map-discovery-addresses-lat-min",
          field: "latitudine",
          operator: "gte",
          value: String(bounds.minLat),
        },
        {
          kind: "condition",
          id: "map-discovery-addresses-lat-max",
          field: "latitudine",
          operator: "lte",
          value: String(bounds.maxLat),
        },
        {
          kind: "condition",
          id: "map-discovery-addresses-lng-min",
          field: "longitudine",
          operator: "gte",
          value: String(bounds.minLng),
        },
        {
          kind: "condition",
          id: "map-discovery-addresses-lng-max",
          field: "longitudine",
          operator: "lte",
          value: String(bounds.maxLng),
        },
      ],
    },
  })

  const addressesByWorkerId = new Map<string, GenericRow[]>()

  for (const row of result.rows as GenericRow[]) {
    const workerId = asString(row.entita_id)
    if (!workerId) continue

    const coordinates = readAddressCoordinates(row)
    if (!coordinates) continue
    if (distanceKmBetweenCoordinates(searchCoordinates, coordinates) > DEFAULT_RADIUS_KM) {
      continue
    }

    const current = addressesByWorkerId.get(workerId) ?? []
    current.push(row)
    addressesByWorkerId.set(workerId, current)
  }

  return addressesByWorkerId
}

async function fetchDiscoveryWorkersByIds({
  workerIds,
  jobRole,
}: {
  workerIds: string[]
  jobRole: string | null | undefined
}) {
  const rows: GenericRow[] = []
  const roleFilterValues = getWorkerRoleFilterValues(jobRole)

  for (let index = 0; index < workerIds.length; index += DISCOVERY_WORKER_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + DISCOVERY_WORKER_BATCH_SIZE)
    const result = await fetchLavoratori({
      select: [
        "id",
        "nome",
        "cognome",
        "email",
        "telefono",
        "foto",
        "check_blacklist",
        "stato_lavoratore",
        "disponibilita",
        "tipo_lavoro_domestico",
        "tipo_rapporto_lavorativo",
        "data_di_nascita",
        "anni_esperienza_colf",
        "anni_esperienza_babysitter",
        "check_lavori_accettabili",
        "cap",
      ],
      limit: batch.length,
      offset: 0,
      orderBy: [{ field: "data_ora_ultima_modifica", ascending: false }],
      filters: {
        kind: "group",
        id: `map-discovery-workers-root-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `map-discovery-workers-id-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
          ...(roleFilterValues.length > 0
            ? [
                {
                  kind: "condition" as const,
                  id: `map-discovery-workers-role-${index}`,
                  field: "tipo_lavoro_domestico",
                  operator: "has_any" as const,
                  value: roleFilterValues.join(","),
                },
              ]
            : []),
        ],
      },
    })

    rows.push(...(result.rows as GenericRow[]))
  }

  return rows
}

function createWorkerIcon(color: string) {
  return L.divIcon({
    className: "ricerca-map-worker-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -8],
  })
}

function WorkerPopupCard({
  worker,
  actionColors,
  onMoveWorker,
}: {
  worker: MapWorker
  actionColors: MapActionColor[]
  onMoveWorker: (workerId: string, targetStatus: string) => void
}) {
  return (
    <div className="w-[340px] space-y-2">
      <LavoratoreCard worker={worker.worker} isActive={false} onClick={() => undefined} />
      <div className="grid grid-cols-3 gap-1.5">
        {MAP_ACTIONS.map((action) => {
          const color =
            actionColors.find(
              (item) =>
                normalizeStatusToken(item.status) ===
                normalizeStatusToken(action.status)
            )?.color ?? getColorHex(null)
          const isCurrentStatus =
            normalizeStatusToken(worker.status) ===
            normalizeStatusToken(action.status)

          return (
            <Button
              key={action.status}
              type="button"
              size="xs"
              variant="outline"
              disabled={isCurrentStatus}
              className="border-transparent text-white! shadow-sm hover:opacity-90 disabled:opacity-45"
              style={{ backgroundColor: color }}
              onClick={() => onMoveWorker(worker.worker.id, action.status)}
            >
              {action.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function bindWorkerPopup(
  marker: L.Marker,
  worker: MapWorker,
  actionColors: MapActionColor[],
  onMoveWorker: (workerId: string, targetStatus: string) => void,
  isPinned: () => boolean
) {
  const container = document.createElement("div")
  const root = createRoot(container)
  let closeTimer: number | null = null

  const cancelClose = () => {
    if (closeTimer === null) return
    window.clearTimeout(closeTimer)
    closeTimer = null
  }

  const scheduleClose = () => {
    cancelClose()
    if (isPinned()) return
    closeTimer = window.setTimeout(() => {
      if (!isPinned()) marker.closePopup()
      closeTimer = null
    }, 160)
  }

  root.render(
    <WorkerPopupCard
      worker={worker}
      actionColors={actionColors}
      onMoveWorker={onMoveWorker}
    />
  )

  marker.bindPopup(container, {
    closeButton: false,
    autoPan: false,
    className: "ricerca-map-worker-popup",
    maxWidth: 360,
    offset: [0, -10],
  })

  container.addEventListener("mouseenter", cancelClose)
  container.addEventListener("mouseleave", scheduleClose)

  marker.on("remove", () => {
    cancelClose()
    window.setTimeout(() => root.unmount(), 0)
  })

  return { cancelClose, scheduleClose }
}

function createHomeIcon() {
  return L.divIcon({
    className: "ricerca-map-home-marker",
    html: "<span>⌂</span>",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  })
}

function useDiscoveryWorkers({
  searchCoordinates,
  jobRole,
}: {
  searchCoordinates: GeoCoordinates | null
  jobRole?: string | null
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<DiscoveryWorkerResult>({
    workers: [],
    missingCoordinates: 0,
  })

  React.useEffect(() => {
    if (!searchCoordinates) {
      setResult({ workers: [], missingCoordinates: 0 })
      return
    }

    let cancelled = false
    const center = searchCoordinates

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [addressesByWorkerId, lookupResult] = await Promise.all([
          fetchDiscoveryWorkerAddresses(center),
          fetchLookupValues(),
        ])
        const workerIds = Array.from(addressesByWorkerId.keys())
        const workerRows = await fetchDiscoveryWorkersByIds({
          workerIds,
          jobRole,
        })
        const lookupColorsByDomain = normalizeLookupColors(lookupResult.rows)
        const workers = workerRows
          .filter((row) => !isUnavailable(asString(row.disponibilita)))
          .map((row) => {
            const worker = buildDiscoveryWorkerListItem(
              row,
              lookupColorsByDomain,
              addressesByWorkerId
            )
            const coordinates = worker.coordinates
            if (!coordinates) return null
            return {
              worker,
              coordinates,
              distanceKm: distanceKmBetweenCoordinates(center, coordinates),
            }
          })
          .filter(
            (
              item
            ): item is {
              worker: MapWorkerListItem
              coordinates: GeoCoordinates
              distanceKm: number
            } => item !== null && item.distanceKm <= DEFAULT_RADIUS_KM
          )
          .sort((left, right) => left.distanceKm - right.distanceKm)

        if (cancelled) return
        setResult({
          workers,
          missingCoordinates: Math.max(0, workerIds.length - workers.length),
        })
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricamento lavoratori mappa"
        )
        setResult({ workers: [], missingCoordinates: 0 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [jobRole, searchCoordinates])

  return { ...result, loading, error }
}

function RicercaLeafletMap({
  searchCoordinates,
  workers,
  actionColors,
  onMoveWorker,
}: {
  searchCoordinates: GeoCoordinates
  workers: MapWorker[]
  actionColors: MapActionColor[]
  onMoveWorker: (workerId: string, targetStatus: string) => void
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const pinnedMarkerRef = React.useRef<L.Marker | null>(null)
  const hoverMarkerRef = React.useRef<L.Marker | null>(null)

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([searchCoordinates.lat, searchCoordinates.lng], DEFAULT_MAP_ZOOM)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [searchCoordinates.lat, searchCoordinates.lng])

  React.useEffect(() => {
    mapRef.current?.setView(
      [searchCoordinates.lat, searchCoordinates.lng],
      DEFAULT_MAP_ZOOM,
      { animate: false },
    )
  }, [searchCoordinates.lat, searchCoordinates.lng])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const layer = L.layerGroup().addTo(map)

    L.circle([searchCoordinates.lat, searchCoordinates.lng], {
      radius: DEFAULT_RADIUS_KM * 1000,
      color: "#2563eb",
      weight: 2,
      opacity: 0.8,
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
      dashArray: "8 8",
    }).addTo(layer)

    L.marker([searchCoordinates.lat, searchCoordinates.lng], {
      icon: createHomeIcon(),
      title: "Ricerca",
    })
      .bindPopup("<strong>Ricerca</strong>")
      .addTo(layer)

    for (const worker of workers) {
      const { lat, lng } = worker.coordinates
      const marker = L.marker([lat, lng], {
        icon: createWorkerIcon(worker.color),
      })
      const popupControls = bindWorkerPopup(
        marker,
        worker,
        actionColors,
        onMoveWorker,
        () => pinnedMarkerRef.current === marker
      )

      marker
        .on("mouseover", (event) => {
          const marker = event.target as L.Marker
          if (pinnedMarkerRef.current) return
          popupControls.cancelClose()
          hoverMarkerRef.current = marker
          marker.openPopup()
        })
        .on("mouseout", (event) => {
          const marker = event.target as L.Marker
          if (pinnedMarkerRef.current === marker) return
          hoverMarkerRef.current = null
          popupControls.scheduleClose()
        })
        .on("click", (event) => {
          const marker = event.target as L.Marker
          popupControls.cancelClose()
          if (pinnedMarkerRef.current && pinnedMarkerRef.current !== marker) {
            pinnedMarkerRef.current.closePopup()
          }
          pinnedMarkerRef.current = marker
          hoverMarkerRef.current = null
          marker.openPopup()
        })
        .on("popupclose", (event) => {
          const marker = event.target as L.Marker
          if (pinnedMarkerRef.current === marker) {
            pinnedMarkerRef.current = null
          }
        })
        .addTo(layer)
    }

    return () => {
      pinnedMarkerRef.current = null
      hoverMarkerRef.current = null
      layer.remove()
    }
  }, [actionColors, onMoveWorker, searchCoordinates, workers])

  return <div ref={containerRef} className="h-full min-h-0 w-full" />
}

function MapFilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

export function RicercaWorkersMapView({
  processId,
  searchGeocode,
  searchMapsEmbed,
  jobRole,
  weeklyDays,
  className,
}: RicercaWorkersMapViewProps) {
  const { loading, error, columns, moveCard, refresh } = useRicercaWorkersPipeline(processId)
  const [hideDiscarded, setHideDiscarded] = React.useState(false)
  const [hidePipeline, setHidePipeline] = React.useState(false)
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([
    ...STATUS_FILTER_OPTIONS,
  ])
  const [selectedWorkDays, setSelectedWorkDays] = React.useState<string[]>(() =>
    defaultWorkDaysFromSearch(weeklyDays)
  )
  const searchCoordinates = React.useMemo(
    () => parseCoordinates(searchGeocode) ?? parseCoordinates(searchMapsEmbed),
    [searchGeocode, searchMapsEmbed],
  )
  React.useEffect(() => {
    setSelectedWorkDays(defaultWorkDaysFromSearch(weeklyDays))
  }, [weeklyDays])
  const normalizedSelectedStatuses = React.useMemo(
    () => normalizeFilterValues(selectedStatuses),
    [selectedStatuses]
  )
  const normalizedSelectedWorkDays = React.useMemo(
    () => normalizeFilterValues(selectedWorkDays),
    [selectedWorkDays]
  )
  const discovery = useDiscoveryWorkers({
    searchCoordinates,
    jobRole,
  })
  const pipelineByWorkerId = React.useMemo(() => {
    const map = new Map<
      string,
      {
        card: RicercaWorkerSelectionCard
        column: RicercaWorkerSelectionColumn
      }
    >()

    for (const column of columns) {
      for (const card of column.cards) {
        map.set(card.worker.id, { card, column })
      }
    }

    return map
  }, [columns])
  const workers = React.useMemo(() => {
    if (!searchCoordinates) return []

    const workersById = new Map<string, MapWorker>()

    for (const item of discovery.workers) {
        if (
          !workerMatchesVisibleFilters(
            item.worker,
            normalizedSelectedStatuses,
            normalizedSelectedWorkDays
          )
        ) {
          continue
        }

        const pipeline = pipelineByWorkerId.get(item.worker.id) ?? null
        const mapStatus = !pipeline
          ? "unreviewed"
          : isDiscardedColumn(pipeline.column)
            ? "discarded"
            : "active"
        const color =
          mapStatus === "discarded"
            ? getColorHex("gray")
            : mapStatus === "active"
              ? getColorHex("green")
              : getColorHex("blue")

        const displayWorker: MapWorkerListItem = pipeline?.card.worker
          ? {
              ...item.worker,
              ...pipeline.card.worker,
              checkLavoriAccettabili: item.worker.checkLavoriAccettabili,
            }
          : item.worker

        workersById.set(item.worker.id, {
          worker: displayWorker,
          selectionId: pipeline?.card.id ?? null,
          status: pipeline?.card.status ?? null,
          mapStatus,
          column: pipeline?.column ?? null,
          coordinates: item.coordinates,
          color,
          distanceKm: item.distanceKm,
        })
    }

    return Array.from(workersById.values())
      .filter((worker) => {
        if (hidePipeline && worker.mapStatus === "active") return false
        if (hideDiscarded) return worker.mapStatus !== "discarded"
        return true
      })
      .sort((left, right) => (left.distanceKm ?? 0) - (right.distanceKm ?? 0))
  }, [
    discovery.workers,
    hideDiscarded,
    hidePipeline,
    normalizedSelectedStatuses,
    normalizedSelectedWorkDays,
    pipelineByWorkerId,
    searchCoordinates,
  ])
  const actionColors = React.useMemo(
    () =>
      MAP_ACTIONS.map((action) => ({
        status: action.status,
        color: resolveTargetStatusColor(columns, action.status),
      })),
    [columns],
  )
  const handleMoveWorker = React.useCallback(
    async (workerId: string, targetStatus: string) => {
      const worker = workers.find((item) => item.worker.id === workerId)
      if (!worker) return

      try {
        if (worker.selectionId) {
          await moveCard(worker.selectionId, targetStatus)
          return
        }

        await createRecord("selezioni_lavoratori", {
          processo_matching_id: processId,
          lavoratore_id: worker.worker.id,
          stato_selezione: targetStatus,
          motivo_inserimento_manuale: "Inserito da mappa ricerca",
          source: "mappa",
        })
        refresh()
        toast.success("Lavoratore aggiunto alla pipeline")
      } catch (caughtError) {
        toast.error(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando lavoratore"
        )
      }
    },
    [moveCard, processId, refresh, workers],
  )

  const insideRadius = workers.filter(
    (worker) => worker.distanceKm !== null && worker.distanceKm <= DEFAULT_RADIUS_KM
  ).length
  const outsideRadius = workers.filter(
    (worker) => worker.distanceKm !== null && worker.distanceKm > DEFAULT_RADIUS_KM
  ).length
  if (loading || discovery.loading) {
    return (
      <div className={cn("rounded-lg border border-border-subtle bg-surface p-4 text-sm text-muted-foreground", className)}>
        Caricamento mappa lavoratori...
      </div>
    )
  }

  if (error || discovery.error) {
    return (
      <div className={cn("rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700", className)}>
        Errore caricamento mappa: {error ?? discovery.error}
      </div>
    )
  }

  if (!searchCoordinates) {
    return (
      <div className={cn("flex h-full items-center justify-center rounded-lg border border-border-subtle bg-surface p-6", className)}>
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-foreground">Coordinate ricerca mancanti</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Per mostrare la mappa serve un valore valido in geocode o nell'embed Maps della ricerca.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface", className)}>
      <header className="shrink-0 border-b border-border-subtle px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mappa lavoratori</h2>
            <p className="text-xs text-muted-foreground">
              {workers.length} lavoratori disponibili nel raggio · pipeline inclusa
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
              Raggio {DEFAULT_RADIUS_KM} km
            </span>
            <span>{insideRadius} dentro</span>
            <span>{outsideRadius} fuori</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <MapFilterGroup label="Stato">
            {STATUS_FILTER_OPTIONS.map((status) => (
              <CheckboxChip
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={(checked) =>
                  setSelectedStatuses((current) =>
                    toggleFilterValue(current, status, checked === true)
                  )
                }
                className="h-7 px-2.5 text-xs"
              >
                {status}
              </CheckboxChip>
            ))}
          </MapFilterGroup>
          <MapFilterGroup label="Giorni">
            {WORK_DAYS_FILTER_OPTIONS.map((workDays) => (
              <CheckboxChip
                key={workDays}
                checked={selectedWorkDays.includes(workDays)}
                onCheckedChange={(checked) =>
                  setSelectedWorkDays((current) =>
                    toggleFilterValue(current, workDays, checked === true)
                  )
                }
                className="h-7 px-2.5 text-xs"
              >
                {workDays.replace("Lavori di ", "").replace(" giorno", "g").replace(" giorni", "g")}
              </CheckboxChip>
            ))}
          </MapFilterGroup>
          <MapFilterGroup label="Vista">
            <CheckboxChip
              checked={hidePipeline}
              onCheckedChange={(checked) => setHidePipeline(checked === true)}
              className="h-7 px-2.5 text-xs"
            >
              Nascondi pipeline
            </CheckboxChip>
            <CheckboxChip
              checked={hideDiscarded}
              onCheckedChange={(checked) => setHideDiscarded(checked === true)}
              className="h-7 px-2.5 text-xs"
            >
              Nascondi scartati
            </CheckboxChip>
          </MapFilterGroup>
        </div>
      </header>

      {workers.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-foreground">Nessun lavoratore geolocalizzato</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nessun lavoratore disponibile trovato nel raggio di lavoro con i filtri attivi.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <style>{`
            .ricerca-map-worker-marker span {
              display: block;
              width: 18px;
              height: 18px;
              border: 3px solid white;
              border-radius: 9999px;
              box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
            }
            .ricerca-map-home-marker span {
              display: grid;
              width: 32px;
              height: 32px;
              place-items: center;
              border: 2px solid white;
              border-radius: 9999px;
              background: #111827;
              color: white;
              font-size: 18px;
              font-weight: 700;
              box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
            }
            .leaflet-container {
              font-family: inherit;
            }
            .ricerca-map-worker-popup .leaflet-popup-content-wrapper {
              background: transparent;
              box-shadow: none;
              padding: 0;
            }
            .ricerca-map-worker-popup .leaflet-popup-content {
              margin: 0;
              width: auto !important;
            }
            .ricerca-map-worker-popup .leaflet-popup-tip-container {
              display: none;
            }
          `}</style>
          <RicercaLeafletMap
            searchCoordinates={searchCoordinates}
            workers={workers}
            actionColors={actionColors}
            onMoveWorker={handleMoveWorker}
          />
        </div>
      )}
    </section>
  )
}
