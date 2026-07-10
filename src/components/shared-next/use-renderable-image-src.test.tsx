import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

// Keep the REAL isHeicImage (so MIME-vs-extension detection is genuinely
// exercised); stub only the decode boundary.
vi.mock("@/lib/heic-image", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/heic-image")>()
  return { ...actual, getRenderableImageSrc: vi.fn() }
})

import { getRenderableImageSrc } from "@/lib/heic-image"
import { useRenderableImageSrc } from "./use-renderable-image-src"

const getSrcMock = getRenderableImageSrc as unknown as Mock

// An opaque pipeline URL: HEIC bytes, but nothing in the path says ".heic".
const NO_EXT_HEIC_URL =
  "http://localhost:54321/storage/v1/object/public/baze-bucket/lavoratori/opaque"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useRenderableImageSrc", () => {
  it("passes a non-HEIC url straight through, without decoding", () => {
    const { result } = renderHook(() =>
      useRenderableImageSrc("https://x/y.jpg", "image/jpeg"),
    )

    expect(result.current).toEqual({ status: "ready", src: "https://x/y.jpg" })
    expect(getSrcMock).not.toHaveBeenCalled()
  })

  it("reports error for an empty src (caller shows its own fallback)", () => {
    const { result } = renderHook(() => useRenderableImageSrc(null))

    expect(result.current).toEqual({ status: "error" })
    expect(getSrcMock).not.toHaveBeenCalled()
  })

  it("detects HEIC by MIME even when the url has no .heic extension, then resolves the converted src", async () => {
    getSrcMock.mockResolvedValue("blob:converted")

    const { result } = renderHook(() =>
      useRenderableImageSrc(NO_EXT_HEIC_URL, "image/heic"),
    )

    // Real isHeicImage flagged it via MIME -> we start decoding.
    expect(result.current).toEqual({ status: "loading" })
    expect(getSrcMock).toHaveBeenCalledWith(NO_EXT_HEIC_URL, "image/heic")

    await waitFor(() =>
      expect(result.current).toEqual({ status: "ready", src: "blob:converted" }),
    )
  })

  it("still detects HEIC by extension when the MIME is missing", () => {
    getSrcMock.mockReturnValue(new Promise<string>(() => {}))

    const { result } = renderHook(() =>
      useRenderableImageSrc("https://x/photo.HEIC", null),
    )

    expect(result.current).toEqual({ status: "loading" })
    expect(getSrcMock).toHaveBeenCalledWith("https://x/photo.HEIC", null)
  })

  it("reports error when decoding fails", async () => {
    getSrcMock.mockRejectedValue(new Error("decode failed"))

    const { result } = renderHook(() =>
      useRenderableImageSrc(NO_EXT_HEIC_URL, "image/heic"),
    )

    await waitFor(() => expect(result.current).toEqual({ status: "error" }))
  })
})
