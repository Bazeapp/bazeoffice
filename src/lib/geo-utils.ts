export type GeoCoordinates = {
  lat: number
  lng: number
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value.trim().replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function isValidCoordinates(lat: number, lng: number) {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function fromPair(first: unknown, second: unknown, reverse = false): GeoCoordinates | null {
  const a = toFiniteNumber(first)
  const b = toFiniteNumber(second)
  if (a === null || b === null) return null

  const lat = reverse ? b : a
  const lng = reverse ? a : b
  return isValidCoordinates(lat, lng) ? { lat, lng } : null
}

function parseCoordinateObject(value: Record<string, unknown>): GeoCoordinates | null {
  const direct =
    fromPair(value.lat, value.lng) ??
    fromPair(value.lat, value.lon) ??
    fromPair(value.latitude, value.longitude) ??
    fromPair(value.Latitude, value.Longitude)
  if (direct) return direct

  const nestedCandidates = [
    value.location,
    value.coordinates,
    value.geometry,
    value.geocode,
    value.coords,
  ]

  for (const candidate of nestedCandidates) {
    const parsed = parseCoordinates(candidate)
    if (parsed) return parsed
  }

  return null
}

function parseCoordinateArray(value: unknown[]): GeoCoordinates | null {
  if (value.length < 2) return null

  const latLng = fromPair(value[0], value[1])
  if (latLng) return latLng

  // GeoJSON commonly stores points as [lng, lat].
  return fromPair(value[0], value[1], true)
}

function parseCoordinateString(value: string): GeoCoordinates | null {
  const text = value.trim()
  if (!text) return null

  const encodedPayload = text.match(/[A-Za-z0-9+/=]{24,}/)?.[0]
  if (encodedPayload && typeof window !== "undefined") {
    try {
      return parseCoordinates(JSON.parse(window.atob(encodedPayload)))
    } catch {
      // Continue with other supported formats.
    }
  }

  try {
    return parseCoordinates(JSON.parse(text))
  } catch {
    // Continue with URL/text patterns.
  }

  const google3d4d = text.match(/!3d(-?\d+(?:[.,]\d+)?)!4d(-?\d+(?:[.,]\d+)?)/i)
  if (google3d4d) return fromPair(google3d4d[1], google3d4d[2])

  const google2d3d = text.match(/!2d(-?\d+(?:[.,]\d+)?)!3d(-?\d+(?:[.,]\d+)?)/i)
  if (google2d3d) return fromPair(google2d3d[1], google2d3d[2], true)

  const atPattern = text.match(/@(-?\d+(?:[.,]\d+)?),\s*(-?\d+(?:[.,]\d+)?)/)
  if (atPattern) return fromPair(atPattern[1], atPattern[2])

  const numbers = Array.from(text.matchAll(/-?\d+(?:[.,]\d+)?/g)).map(
    (match) => match[0]
  )
  for (let index = 0; index < numbers.length - 1; index += 1) {
    const candidate = fromPair(numbers[index], numbers[index + 1])
    if (candidate) return candidate
  }

  return null
}

export function parseCoordinates(value: unknown): GeoCoordinates | null {
  if (value === null || value === undefined) return null

  if (typeof value === "string") return parseCoordinateString(value)
  if (Array.isArray(value)) return parseCoordinateArray(value)
  if (typeof value === "object") return parseCoordinateObject(value as Record<string, unknown>)

  return null
}

export function distanceKmBetweenCoordinates(
  first: GeoCoordinates,
  second: GeoCoordinates
) {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = toRadians(second.lat - first.lat)
  const deltaLng = toRadians(second.lng - first.lng)
  const lat1 = toRadians(first.lat)
  const lat2 = toRadians(second.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}
