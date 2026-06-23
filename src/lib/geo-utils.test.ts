import { describe, it, expect } from "vitest"

import {
  parseCoordinates,
  distanceKmBetweenCoordinates,
} from "@/lib/geo-utils"

// Characterization tests: they pin the CURRENT behavior of the coordinate
// parser so a refactor can't silently change how a stored location is read.

describe("parseCoordinates", () => {
  it("returns null for null/undefined and non-coordinate primitives", () => {
    expect(parseCoordinates(null)).toBeNull()
    expect(parseCoordinates(undefined)).toBeNull()
    expect(parseCoordinates(123)).toBeNull()
    expect(parseCoordinates(true)).toBeNull()
    expect(parseCoordinates("hello world")).toBeNull()
  })

  it("parses a 'lat, lng' string (comma decimals normalized to dots)", () => {
    expect(parseCoordinates("45.4642, 9.1900")).toEqual({ lat: 45.4642, lng: 9.19 })
  })

  it("parses objects under several key spellings", () => {
    expect(parseCoordinates({ lat: 45.46, lng: 9.19 })).toEqual({ lat: 45.46, lng: 9.19 })
    expect(parseCoordinates({ lat: 45.46, lon: 9.19 })).toEqual({ lat: 45.46, lng: 9.19 })
    expect(parseCoordinates({ latitude: 45.46, longitude: 9.19 })).toEqual({
      lat: 45.46,
      lng: 9.19,
    })
  })

  it("parses a [lat, lng] array", () => {
    expect(parseCoordinates([45.46, 9.19])).toEqual({ lat: 45.46, lng: 9.19 })
  })

  it("falls back to GeoJSON [lng, lat] ONLY when the direct pair is out of range", () => {
    // [120, 45]: 120 is an impossible latitude, so the reversed reading wins.
    expect(parseCoordinates([120, 45])).toEqual({ lat: 45, lng: 120 })
  })

  it("extracts coordinates from a Google Maps @lat,lng URL", () => {
    expect(
      parseCoordinates("https://maps.google.com/maps/@45.4642,9.1900,15z"),
    ).toEqual({ lat: 45.4642, lng: 9.19 })
  })

  it("returns null when the numbers are out of geographic range", () => {
    expect(parseCoordinates("200, 300")).toBeNull()
  })
})

describe("distanceKmBetweenCoordinates", () => {
  it("is exactly 0 between identical points", () => {
    const p = { lat: 45.46, lng: 9.19 }
    expect(distanceKmBetweenCoordinates(p, p)).toBe(0)
  })

  it("is ~111 km per degree of latitude at the equator", () => {
    const d = distanceKmBetweenCoordinates({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeCloseTo(111.19, 1)
  })

  it("is ~477 km from Milan to Rome", () => {
    const d = distanceKmBetweenCoordinates(
      { lat: 45.4642, lng: 9.19 },
      { lat: 41.9028, lng: 12.4964 },
    )
    expect(d).toBeGreaterThan(470)
    expect(d).toBeLessThan(485)
  })
})
