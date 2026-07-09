import type { Mock } from "vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { heicTo } from "heic-to"

import {
  __resetHeicImageCacheForTests,
  getRenderableImageSrc,
  HEIC_CACHE_LIMIT,
  isHeicImage,
} from "./heic-image"

vi.mock("heic-to", () => ({ heicTo: vi.fn() }))

const heicToMock = heicTo as unknown as Mock

let objectUrlCounter = 0
let createdObjectUrls: string[] = []
let revokedObjectUrls: string[] = []
let fetchMock: Mock

// The eviction revoke runs on a resolved promise's microtask; flush it.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  __resetHeicImageCacheForTests()
  vi.clearAllMocks()

  objectUrlCounter = 0
  createdObjectUrls = []
  revokedObjectUrls = []

  URL.createObjectURL = vi.fn(() => {
    const url = `blob:mock-${objectUrlCounter++}`
    createdObjectUrls.push(url)
    return url
  }) as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn((url: string) => {
    revokedObjectUrls.push(url)
  })

  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(["heic-bytes"]),
  }))
  global.fetch = fetchMock as unknown as typeof fetch

  heicToMock.mockResolvedValue(new Blob(["jpeg-bytes"], { type: "image/jpeg" }))
})

afterEach(() => {
  __resetHeicImageCacheForTests()
})

describe("isHeicImage", () => {
  it("detects HEIC/HEIF by extension and MIME type", () => {
    expect(isHeicImage({ url: "docs/photo.heic" })).toBe(true)
    expect(isHeicImage({ url: "https://x/y.HEIF?token=1" })).toBe(true)
    expect(isHeicImage({ type: "image/heic" })).toBe(true)
    expect(isHeicImage({ type: "image/heif" })).toBe(true)
    // MIME wins even when the extension looks renderable.
    expect(isHeicImage({ url: "x.jpg", type: "image/heic" })).toBe(true)
  })

  it("returns false for renderable formats and empty input", () => {
    expect(isHeicImage({ url: "photo.jpg" })).toBe(false)
    expect(isHeicImage({ url: "scan.pdf" })).toBe(false)
    expect(isHeicImage({ type: "image/png" })).toBe(false)
    expect(isHeicImage({})).toBe(false)
    expect(isHeicImage({ url: null, type: null })).toBe(false)
  })
})

describe("getRenderableImageSrc", () => {
  it("returns a non-HEIC url unchanged without fetching or decoding", async () => {
    const url = "https://x/y.jpg"
    await expect(getRenderableImageSrc(url, "image/jpeg")).resolves.toBe(url)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(heicToMock).not.toHaveBeenCalled()
  })

  it("converts a HEIC url to a JPEG object URL", async () => {
    const result = await getRenderableImageSrc("https://x/doc.heic", "image/heic")

    expect(result).toBe("blob:mock-0")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(heicToMock).toHaveBeenCalledTimes(1)
    expect(heicToMock.mock.calls[0][0]).toMatchObject({ type: "image/jpeg" })
  })

  it("caches by url — a second call decodes at most once", async () => {
    const url = "https://x/doc.heic"
    const first = await getRenderableImageSrc(url, "image/heic")
    const second = await getRenderableImageSrc(url, "image/heic")

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(heicToMock).toHaveBeenCalledTimes(1)
  })

  it("de-duplicates concurrent calls for the same url", async () => {
    const url = "https://x/doc.heic"
    const [a, b] = await Promise.all([
      getRenderableImageSrc(url, "image/heic"),
      getRenderableImageSrc(url, "image/heic"),
    ])

    expect(a).toBe(b)
    expect(heicToMock).toHaveBeenCalledTimes(1)
  })

  it("rejects on failed download and allows a later retry", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })

    await expect(getRenderableImageSrc("https://x/doc.heic", "image/heic")).rejects.toThrow()
    // Cache entry was dropped, so a retry re-attempts the conversion.
    await expect(getRenderableImageSrc("https://x/doc.heic", "image/heic")).resolves.toBe(
      "blob:mock-0",
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("aborts a hung download after the timeout and rejects (no forever-pending)", async () => {
    vi.useFakeTimers()
    // fetch honors the abort signal but otherwise never settles.
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")))
        }),
    )

    const promise = getRenderableImageSrc("https://x/doc.heic", "image/heic")
    const rejection = expect(promise).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(20_000)
    await rejection

    vi.useRealTimers()
  })

  it("evicts and revokes the oldest object URL past the cache limit", async () => {
    for (let i = 0; i <= HEIC_CACHE_LIMIT; i++) {
      await getRenderableImageSrc(`https://x/doc-${i}.heic`, "image/heic")
    }
    await flush()

    expect(revokedObjectUrls).toContain(createdObjectUrls[0])
  })
})
