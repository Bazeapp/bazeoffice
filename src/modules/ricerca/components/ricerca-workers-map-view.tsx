import * as React from "react"
import * as L from "leaflet"
import { createRoot } from "react-dom/client"
import { toast } from "sonner"
import "leaflet/dist/leaflet.css"
import { ListFilterIcon, RotateCcwIcon } from "lucide-react"

import { LavoratoreCard, type LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
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
import { asString, getAgeFromBirthDate, getDefaultWorkerAvatar, isDisponibileRicerca, normalizeDomesticRoleLabels, readArrayStrings, toAvatarImage, toWorkerStatusFlags } from "@/modules/lavoratori/lib"
import { isBlacklistValue, normalizeLookupColors, resolveLookupColor } from "@/lib/lookup-utils"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
  RicercaWorkersPipelineState,
} from "../types"
import { fetchLookupValues } from "@/lib/lookup-values"
import { createRecord } from "@/lib/record-crud"
import { fetchLavoratoriByIds } from "@/modules/lavoratori/queries"
import { fetchIndirizziInBbox } from "../queries/fetch-indirizzi-in-bbox"
import { fetchLavoratoriSelezioniCorrelate } from "../queries/fetch-lavoratori-selezioni-correlate"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import {
  distanceKmBetweenCoordinates,
  type GeoCoordinates,
} from "@/lib/geo-utils"
import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { cn } from "@/lib/utils"
import {
  AUTOMUNITI_FILTER_OPTIONS,
  ETA_FILTER_BUCKETS,
  GENERE_FILTER_OPTIONS,
  createDefaultAdvancedFilters,
  deriveNazionalitaOptions,
  hasActiveAdvancedFilters,
  isSameSet,
  workerMatchesAdvancedFilters,
  type MapAdvancedFilters,
} from "../lib/map-filters"
import { excludeCurrentProcess } from "../lib/map-related-selections"
import { buildRelatedSelectionsMap } from "@/modules/lavoratori/lib"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"

const DEFAULT_RADIUS_KM = 5
const RADIUS_OPTIONS_KM = [2, 5, 10] as const
const DEFAULT_MAP_ZOOM = 13
const DISCOVERY_ADDRESS_PAGE_SIZE = 1000
const DISCOVERY_WORKER_BATCH_SIZE = 100
const MAP_ACTIONS = [
  { label: "Prospetto", status: "Prospetto" },
  { label: "Da colloquiare", status: "Da colloquiare" },
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
  searchLat?: number | null
  searchLng?: number | null
  jobRole?: string | null
  weeklyDays?: string | null
  pipelineState: RicercaWorkersPipelineState
  className?: string
  /**
   * Invocata quando il geocoding on-demand (lanciato perche' la mappa non ha
   * coordinate al mount) e' andato a buon fine. Il parent deve reidratare la
   * card del processo cosi' che `searchLat`/`searchLng` arrivino popolati.
   */
  onCoordinatesGeocoded?: () => void
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
  addressesByWorkerId: Map<string, GenericRow[]>,
  otherSelectionsByWorkerId: Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >
): MapWorkerListItem {
  const workerId = asString(worker.id) || "unknown-worker"
  const nome = asString(worker.nome)
  const cognome = asString(worker.cognome)
  const statoLavoratore = asString(worker.stato_lavoratore) || null
  const disponibilita = asString(worker.disponibilita) || null
  const statusFlags = toWorkerStatusFlags(statoLavoratore)
  const ruoliDomestici = normalizeDomesticRoleLabels(readArrayStrings(worker.tipo_lavoro_domestico))
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavori = readArrayStrings(worker.tipo_rapporto_lavorativo)
  const tipoLavoro = tipoLavori[0] ?? null
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

  const avatarImage = toAvatarImage(worker)

  return {
    id: workerId,
    nomeCompleto: `${nome} ${cognome}`.trim() || workerId,
    immagineUrl: avatarImage?.url ?? getDefaultWorkerAvatar(workerId),
    immagineType: avatarImage?.type ?? null,
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
    tipoLavori,
    tipoLavoriColors: Object.fromEntries(
      tipoLavori.map((tipo) => [
        tipo,
        resolveLookupColor(
          lookupColorsByDomain,
          "lavoratori.tipo_rapporto_lavorativo",
          tipo
        ),
      ])
    ),
    tipoLavoro,
    tipoLavoroColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_rapporto_lavorativo",
      tipoLavoro
    ),
    ruoliDomestici,
    eta: getAgeFromBirthDate(worker.data_di_nascita),
    sesso: asString(worker.sesso) || null,
    nazionalita: asString(worker.nazionalita) || null,
    comeTiSposti: readArrayStrings(worker.come_ti_sposti),
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
    otherActiveSelections: otherSelectionsByWorkerId.get(workerId) ?? null,
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

async function fetchDiscoveryWorkerAddresses(
  searchCoordinates: GeoCoordinates,
  radiusKm: number
) {
  const bounds = getBoundingBox(searchCoordinates, radiusKm)
  const addressesByWorkerId = new Map<string, GenericRow[]>()

  for (let offset = 0; ; offset += DISCOVERY_ADDRESS_PAGE_SIZE) {
    const result = await fetchIndirizziInBbox({
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLng: bounds.minLng,
      maxLng: bounds.maxLng,
      entitaTabella: "lavoratori",
      limit: DISCOVERY_ADDRESS_PAGE_SIZE,
      offset,
    })

    const rows = result.rows as GenericRow[]

    for (const row of rows) {
      const workerId = asString(row.entita_id)
      if (!workerId) continue

      const coordinates = readAddressCoordinates(row)
      if (!coordinates) continue
      if (distanceKmBetweenCoordinates(searchCoordinates, coordinates) > radiusKm) {
        continue
      }

      const current = addressesByWorkerId.get(workerId) ?? []
      current.push(row)
      addressesByWorkerId.set(workerId, current)
    }

    if (rows.length < DISCOVERY_ADDRESS_PAGE_SIZE) break
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
    const result = await fetchLavoratoriByIds(
      batch,
      roleFilterValues.length > 0 ? roleFilterValues : undefined,
    )

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
  onOtherActiveSelectionsOpenChange,
}: {
  worker: MapWorker
  actionColors: MapActionColor[]
  onMoveWorker: (workerId: string, targetStatus: string) => void
  onOtherActiveSelectionsOpenChange?: (open: boolean) => void
}) {
  return (
    <div className="w-[340px] space-y-2">
      <LavoratoreCard
        worker={worker.worker}
        isActive={false}
        onClick={() => undefined}
        onOtherActiveSelectionsOpenChange={onOtherActiveSelectionsOpenChange}
      />
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
  isPinned: () => boolean,
  pinMarker: () => void
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
      onOtherActiveSelectionsOpenChange={(open) => {
        if (open) {
          cancelClose()
          pinMarker()
        }
      }}
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
  radiusKm,
  processId,
  recruiterLabelsById,
}: {
  searchCoordinates: GeoCoordinates | null
  jobRole?: string | null
  radiusKm: number
  processId: string
  recruiterLabelsById: Map<string, string>
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
          fetchDiscoveryWorkerAddresses(center, radiusKm),
          fetchLookupValues(),
        ])
        const workerIds = Array.from(addressesByWorkerId.keys())
        const [workerRows, correlateRows] = await Promise.all([
          fetchDiscoveryWorkersByIds({ workerIds, jobRole }),
          fetchLavoratoriSelezioniCorrelate(workerIds),
        ])
        const lookupColorsByDomain = normalizeLookupColors(lookupResult.rows)
        const otherSelectionsByWorkerId = buildRelatedSelectionsMap(
          excludeCurrentProcess(correlateRows, processId),
          lookupColorsByDomain,
          recruiterLabelsById
        )
        const workers = workerRows
          .filter((row) =>
            isDisponibileRicerca({
              disponibilita: asString(row.disponibilita) || null,
              data_ritorno_disponibilita:
                asString(row.data_ritorno_disponibilita) || null,
            }),
          )
          .map((row) => {
            const worker = buildDiscoveryWorkerListItem(
              row,
              lookupColorsByDomain,
              addressesByWorkerId,
              otherSelectionsByWorkerId
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
            } => item !== null && item.distanceKm <= radiusKm
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
  }, [jobRole, processId, radiusKm, recruiterLabelsById, searchCoordinates])

  return { ...result, loading, error }
}

function RicercaLeafletMap({
  searchCoordinates,
  radiusKm,
  workers,
  actionColors,
  onMoveWorker,
}: {
  searchCoordinates: GeoCoordinates
  radiusKm: number
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
      radius: radiusKm * 1000,
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
        () => pinnedMarkerRef.current === marker,
        () => {
          if (pinnedMarkerRef.current && pinnedMarkerRef.current !== marker) {
            pinnedMarkerRef.current.closePopup()
          }
          pinnedMarkerRef.current = marker
          hoverMarkerRef.current = null
        }
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
        .on("popupopen", (event) => {
          // Il popup di Leaflet cresce verso l'alto dal marker. Se non c'entra
          // sopra (marker vicino al bordo superiore della mappa) lo apriamo
          // sotto, aggiungendo la classe .is-below (vedi <style> translateY).
          const marker = event.target as L.Marker
          const element = marker.getPopup()?.getElement()
          if (!element) return
          const cardHeight =
            element.querySelector<HTMLElement>(".leaflet-popup-content-wrapper")
              ?.offsetHeight || 280
          const markerY = map.latLngToContainerPoint(marker.getLatLng()).y
          element.classList.toggle("is-below", markerY - cardHeight - 18 < 8)
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
  }, [actionColors, onMoveWorker, radiusKm, searchCoordinates, workers])

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
  searchLat,
  searchLng,
  jobRole,
  weeklyDays,
  pipelineState,
  className,
  onCoordinatesGeocoded,
}: RicercaWorkersMapViewProps) {
  const { loading, error, columns, moveCard, refresh } = pipelineState
  const [radiusKm, setRadiusKm] = React.useState(DEFAULT_RADIUS_KM)
  // Stato del geocoding on-demand: lo lanciamo una sola volta per processo
  // quando la mappa apre senza coord. Se la EF geocoder risolve, chiediamo al
  // parent di reidratare la card; se fallisce mostriamo il banner statico.
  const [geocodeState, setGeocodeState] = React.useState<{
    status: "idle" | "running" | "done" | "error"
    error: string | null
  }>({ status: "idle", error: null })
  const geocodeAttemptedRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    geocodeAttemptedRef.current = null
    setGeocodeState({ status: "idle", error: null })
  }, [processId])
  React.useEffect(() => {
    if (typeof searchLat === "number" && typeof searchLng === "number") return
    if (geocodeAttemptedRef.current === processId) return
    geocodeAttemptedRef.current = processId

    let cancelled = false
    setGeocodeState({ status: "running", error: null })
    void (async () => {
      try {
        await invokeEdgeFunction<unknown>("geocode-worker-addresses", {
          entitaTabella: "processi_matching",
          entitaId: processId,
          dryRun: false,
          limit: 5,
        })
        if (cancelled) return
        setGeocodeState({ status: "done", error: null })
        onCoordinatesGeocoded?.()
      } catch (caughtError) {
        if (cancelled) return
        setGeocodeState({
          status: "error",
          error:
            caughtError instanceof Error
              ? caughtError.message
              : "Errore geocoding indirizzo",
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [processId, searchLat, searchLng, onCoordinatesGeocoded])
  const [hideDiscarded, setHideDiscarded] = React.useState(false)
  const [hidePipeline, setHidePipeline] = React.useState(false)
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([
    ...STATUS_FILTER_OPTIONS,
  ])
  const [selectedWorkDays, setSelectedWorkDays] = React.useState<string[]>(() =>
    defaultWorkDaysFromSearch(weeklyDays)
  )
  const [advancedFilters, setAdvancedFilters] = React.useState<MapAdvancedFilters>(
    createDefaultAdvancedFilters
  )
  const [filtersExpanded, setFiltersExpanded] = React.useState(true)
  const nazionalitaAnchor = useComboboxAnchor()
  const searchCoordinates = React.useMemo(
    () =>
      typeof searchLat === "number" && typeof searchLng === "number"
        ? { lat: searchLat, lng: searchLng }
        : null,
    [searchLat, searchLng],
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
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions]
  )
  const discovery = useDiscoveryWorkers({
    searchCoordinates,
    jobRole,
    radiusKm,
    processId,
    recruiterLabelsById,
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
          ) ||
          !workerMatchesAdvancedFilters(item.worker, advancedFilters)
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
              otherActiveSelections: item.worker.otherActiveSelections,
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
    advancedFilters,
    discovery.workers,
    hideDiscarded,
    hidePipeline,
    normalizedSelectedStatuses,
    normalizedSelectedWorkDays,
    pipelineByWorkerId,
    searchCoordinates,
  ])
  const nazionalitaOptions = React.useMemo(
    () => deriveNazionalitaOptions(discovery.workers.map((item) => item.worker)),
    [discovery.workers]
  )
  const filtersActive = React.useMemo(
    () =>
      hasActiveAdvancedFilters(advancedFilters) ||
      !isSameSet(selectedStatuses, [...STATUS_FILTER_OPTIONS]) ||
      !isSameSet(selectedWorkDays, defaultWorkDaysFromSearch(weeklyDays)),
    [advancedFilters, selectedStatuses, selectedWorkDays, weeklyDays]
  )
  const toggleAdvancedFilter = React.useCallback(
    (group: "genere" | "automuniti" | "eta", value: string, checked: boolean) => {
      setAdvancedFilters((current) => ({
        ...current,
        [group]: toggleFilterValue(current[group], value, checked),
      }))
    },
    []
  )
  const resetFilters = React.useCallback(() => {
    setSelectedStatuses([...STATUS_FILTER_OPTIONS])
    setSelectedWorkDays(defaultWorkDaysFromSearch(weeklyDays))
    setAdvancedFilters(createDefaultAdvancedFilters())
  }, [weeklyDays])
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
        await invokeWorkerAvailabilityForIds(
          getSelectionAvailabilityWorkerIds(null, {
            processo_matching_id: processId,
            lavoratore_id: worker.worker.id,
            stato_selezione: targetStatus,
          })
        )
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
    (worker) => worker.distanceKm !== null && worker.distanceKm <= radiusKm
  ).length
  const outsideRadius = workers.filter(
    (worker) => worker.distanceKm !== null && worker.distanceKm > radiusKm
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
    if (geocodeState.status === "running") {
      return (
        <div className={cn("flex h-full items-center justify-center rounded-lg border border-border-subtle bg-surface p-6", className)}>
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-foreground">
              Geocodifica indirizzo in corso…
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stiamo calcolando latitudine e longitudine dall'indirizzo della
              ricerca. La mappa si aprirà appena pronto.
            </p>
          </div>
        </div>
      )
    }

    const isErrorState = geocodeState.status === "error"
    return (
      <div className={cn("flex h-full items-center justify-center rounded-lg border border-border-subtle bg-surface p-6", className)}>
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-foreground">
            {isErrorState
              ? "⚠️ Geocodifica fallita"
              : "⚠️ Indirizzo del processo mancante, impossibile centrare la mappa"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isErrorState
              ? `Non sono riuscito a calcolare le coordinate dall'indirizzo (${
                  geocodeState.error ?? "errore sconosciuto"
                }). Verifica via, civico, CAP e comune nella scheda della ricerca.`
              : "Compila l'indirizzo (di prova o luogo) nella scheda della ricerca per visualizzare i lavoratori geolocalizzati."}
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
            <div className="flex overflow-hidden rounded-full border border-blue-200 bg-blue-50 font-medium text-blue-700">
              {RADIUS_OPTIONS_KM.map((radiusOption) => (
                <button
                  key={radiusOption}
                  type="button"
                  className={cn(
                    "h-7 px-2.5 text-xs transition-colors",
                    radiusKm === radiusOption
                      ? "bg-blue-600 text-white"
                      : "hover:bg-blue-100"
                  )}
                  onClick={() => setRadiusKm(radiusOption)}
                >
                  {radiusOption} km
                </button>
              ))}
            </div>
            <span>{insideRadius} dentro</span>
            <span>{outsideRadius} fuori</span>
            <button
              type="button"
              className="relative inline-flex size-7 items-center justify-center rounded-lg text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-neutral-100"
              title="Filtri avanzati"
              aria-label="Filtri avanzati"
              aria-expanded={filtersExpanded}
              onClick={() => setFiltersExpanded((open) => !open)}
            >
              <ListFilterIcon className="size-4" />
              {filtersActive ? (
                <span className="absolute -right-1 -top-1 size-2 rounded-full bg-blue-600" />
              ) : null}
            </button>
          </div>
        </div>
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleContent className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
          <MapFilterGroup label="Genere">
            {GENERE_FILTER_OPTIONS.map((genere) => (
              <CheckboxChip
                key={genere}
                checked={advancedFilters.genere.includes(genere)}
                onCheckedChange={(checked) =>
                  toggleAdvancedFilter("genere", genere, checked === true)
                }
                className="h-7 px-2.5 text-xs"
              >
                {genere}
              </CheckboxChip>
            ))}
          </MapFilterGroup>
          <MapFilterGroup label="Automuniti">
            {AUTOMUNITI_FILTER_OPTIONS.map((option) => (
              <CheckboxChip
                key={option}
                checked={advancedFilters.automuniti.includes(option)}
                onCheckedChange={(checked) =>
                  toggleAdvancedFilter("automuniti", option, checked === true)
                }
                className="h-7 px-2.5 text-xs"
              >
                {option}
              </CheckboxChip>
            ))}
          </MapFilterGroup>
          <MapFilterGroup label="Età">
            {ETA_FILTER_BUCKETS.map((bucket) => (
              <CheckboxChip
                key={bucket.key}
                checked={advancedFilters.eta.includes(bucket.key)}
                onCheckedChange={(checked) =>
                  toggleAdvancedFilter("eta", bucket.key, checked === true)
                }
                className="h-7 px-2.5 text-xs"
              >
                {bucket.label}
              </CheckboxChip>
            ))}
          </MapFilterGroup>
          <MapFilterGroup label="Nazionalità">
            <Combobox
              multiple
              autoHighlight
              items={nazionalitaOptions}
              value={advancedFilters.nazionalita}
              onValueChange={(next) =>
                setAdvancedFilters((current) => ({
                  ...current,
                  nazionalita: next as string[],
                }))
              }
            >
              <ComboboxChips ref={nazionalitaAnchor} className="min-w-52">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>{value}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Nazionalità" />
                    </React.Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={nazionalitaAnchor} className="max-h-80">
                <ComboboxEmpty>Nessuna nazionalità</ComboboxEmpty>
                <ComboboxList className="max-h-72 overflow-y-auto">
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              title="Reset filtri"
              onClick={resetFilters}
            >
              <RotateCcwIcon className="size-3.5" />
              Reset
            </Button>
          ) : null}
          </CollapsibleContent>
        </Collapsible>
      </header>

      {workers.length === 0 ? (
        <div className="shrink-0 border-b border-border-subtle bg-amber-50 px-4 py-2 text-xs text-amber-800">
          0 lavoratori disponibili nel raggio con i filtri attivi.
        </div>
      ) : null}
      <div className="relative isolate min-h-0 flex-1">
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
            /* Il tip è nascosto: azzera il margin-bottom da 20px che Leaflet
               riserva per il tip, altrimenti la card resta ~20px troppo in alto. */
            .leaflet-popup.ricerca-map-worker-popup {
              margin-bottom: 0;
            }
            .ricerca-map-worker-popup.is-below .leaflet-popup-content-wrapper {
              transform: translateY(calc(100% + 30px));
            }
          `}</style>
          <RicercaLeafletMap
            searchCoordinates={searchCoordinates}
            radiusKm={radiusKm}
            workers={workers}
            actionColors={actionColors}
            onMoveWorker={handleMoveWorker}
          />
        </div>
    </section>
  )
}
