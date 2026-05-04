import * as React from "react"
import * as L from "leaflet"
import { createRoot } from "react-dom/client"
import "leaflet/dist/leaflet.css"

import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "@/hooks/use-ricerca-workers-pipeline"
import { useRicercaWorkersPipeline } from "@/hooks/use-ricerca-workers-pipeline"
import {
  distanceKmBetweenCoordinates,
  parseCoordinates,
  type GeoCoordinates,
} from "@/lib/geo-utils"
import { cn } from "@/lib/utils"

const DEFAULT_RADIUS_KM = 5
const DEFAULT_MAP_ZOOM = 13
const MAP_ACTIONS = [
  { label: "Da colloquiare", status: "Da colloquiare" },
  { label: "Selezionato", status: "Selezionato" },
  { label: "Non selezionato", status: "Non selezionato" },
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
  className?: string
}

type MapWorker = {
  card: RicercaWorkerSelectionCard
  column: RicercaWorkerSelectionColumn
  coordinates: GeoCoordinates
  color: string
  distanceKm: number | null
}

type MapActionColor = {
  status: string
  color: string
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

function getColorHex(color: string | null | undefined) {
  const token = String(color ?? "").trim().toLowerCase()
  return COLOR_HEX_BY_TOKEN[token] ?? COLOR_HEX_BY_TOKEN.sky
}

function resolveCardColor(column: RicercaWorkerSelectionColumn, card: RicercaWorkerSelectionCard) {
  const groupColor =
    column.groupColors?.[normalizeStatusToken(card.status)] ??
    column.groupColors?.[normalizeStatusToken(column.label)]

  return getColorHex(groupColor ?? column.color)
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
  onMoveWorker: (selectionId: string, targetStatus: string) => void
}) {
  return (
    <div className="w-[340px] space-y-2">
      <LavoratoreCard worker={worker.card.worker} isActive={false} onClick={() => undefined} />
      <div className="grid grid-cols-3 gap-1.5">
        {MAP_ACTIONS.map((action) => {
          const color =
            actionColors.find(
              (item) =>
                normalizeStatusToken(item.status) ===
                normalizeStatusToken(action.status)
            )?.color ?? getColorHex(null)
          const isCurrentStatus =
            normalizeStatusToken(worker.card.status) ===
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
              onClick={() => onMoveWorker(worker.card.id, action.status)}
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
  onMoveWorker: (selectionId: string, targetStatus: string) => void,
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

function flattenMapWorkers(
  columns: RicercaWorkerSelectionColumn[],
  searchCoordinates: GeoCoordinates | null
) {
  const workers: MapWorker[] = []
  let missingCoordinates = 0

  for (const column of columns) {
    for (const card of column.cards) {
      const coordinates = card.worker.coordinates ?? null
      if (!coordinates) {
        missingCoordinates += 1
        continue
      }

      workers.push({
        card,
        column,
        coordinates,
        color: resolveCardColor(column, card),
        distanceKm: searchCoordinates
          ? distanceKmBetweenCoordinates(searchCoordinates, coordinates)
          : null,
      })
    }
  }

  return { workers, missingCoordinates }
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
  onMoveWorker: (selectionId: string, targetStatus: string) => void
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

export function RicercaWorkersMapView({
  processId,
  searchGeocode,
  searchMapsEmbed,
  className,
}: RicercaWorkersMapViewProps) {
  const { loading, error, columns, moveCard } = useRicercaWorkersPipeline(processId)
  const [hideDiscarded, setHideDiscarded] = React.useState(false)
  const [onlyCandidates, setOnlyCandidates] = React.useState(false)
  const searchCoordinates = React.useMemo(
    () => parseCoordinates(searchGeocode) ?? parseCoordinates(searchMapsEmbed),
    [searchGeocode, searchMapsEmbed],
  )
  const visibleColumns = React.useMemo(
    () =>
      columns.filter((column) => {
        const columnToken = normalizeStatusToken(column.id)
        const labelToken = normalizeStatusToken(column.label)

        if (onlyCandidates) {
          return columnToken === "__candidati__" || labelToken === "candidati"
        }

        if (hideDiscarded) {
          return columnToken !== "__archivio__" && labelToken !== "scartati"
        }

        return true
      }),
    [columns, hideDiscarded, onlyCandidates],
  )

  const { workers, missingCoordinates } = React.useMemo(
    () => flattenMapWorkers(visibleColumns, searchCoordinates),
    [visibleColumns, searchCoordinates],
  )
  const actionColors = React.useMemo(
    () =>
      MAP_ACTIONS.map((action) => ({
        status: action.status,
        color: resolveTargetStatusColor(columns, action.status),
      })),
    [columns],
  )
  const handleMoveWorker = React.useCallback(
    (selectionId: string, targetStatus: string) => {
      void moveCard(selectionId, targetStatus)
    },
    [moveCard],
  )

  const insideRadius = workers.filter(
    (worker) => worker.distanceKm !== null && worker.distanceKm <= DEFAULT_RADIUS_KM
  ).length
  const outsideRadius = workers.filter(
    (worker) => worker.distanceKm !== null && worker.distanceKm > DEFAULT_RADIUS_KM
  ).length
  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border-subtle bg-surface p-4 text-sm text-muted-foreground", className)}>
        Caricamento mappa lavoratori...
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700", className)}>
        Errore caricamento mappa: {error}
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
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Mappa lavoratori</h2>
          <p className="text-xs text-muted-foreground">
            {workers.length} con coordinate · {missingCoordinates} senza coordinate
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2 py-1">
            <Checkbox
              checked={hideDiscarded}
              onCheckedChange={(checked) => setHideDiscarded(checked === true)}
            />
            <span>Nascondi scartati</span>
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2 py-1">
            <Checkbox
              checked={onlyCandidates}
              onCheckedChange={(checked) => setOnlyCandidates(checked === true)}
            />
            <span>Solo Candidati</span>
          </label>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
            Raggio {DEFAULT_RADIUS_KM} km
          </span>
          <span>{insideRadius} dentro</span>
          <span>{outsideRadius} fuori</span>
        </div>
      </header>

      {workers.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-foreground">Nessun lavoratore geolocalizzato</p>
            <p className="mt-1 text-xs text-muted-foreground">
              I lavoratori restano in pipeline, ma non hanno coordinate disponibili per la mappa.
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
