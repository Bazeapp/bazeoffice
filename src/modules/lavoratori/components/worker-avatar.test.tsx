import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/lib/heic-image", () => ({
  isHeicImage: vi.fn(),
  getRenderableImageSrc: vi.fn(),
}))

import { getRenderableImageSrc, isHeicImage } from "@/lib/heic-image"
import { WorkerAvatar } from "./worker-avatar"

const isHeicMock = isHeicImage as unknown as Mock
const getSrcMock = getRenderableImageSrc as unknown as Mock

const NO_EXT_HEIC_URL =
  "http://localhost:54321/storage/v1/object/public/baze-bucket/lavoratori/opaque"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("WorkerAvatar", () => {
  it("passes a non-HEIC photo through without decoding", () => {
    isHeicMock.mockReturnValue(false)

    render(
      <WorkerAvatar src="https://x/p.jpg" type="image/jpeg" alt="Maria Piedad" fallback="MP" />,
    )

    expect(getSrcMock).not.toHaveBeenCalled()
  })

  it("decodes a HEIC photo detected by MIME, with no .heic extension in the url", () => {
    isHeicMock.mockReturnValue(true)
    getSrcMock.mockReturnValue(new Promise<string>(() => {}))

    render(
      <WorkerAvatar
        src={NO_EXT_HEIC_URL}
        type="image/heic"
        alt="Maria Piedad"
        fallback="MP"
      />,
    )

    expect(getSrcMock).toHaveBeenCalledWith(NO_EXT_HEIC_URL, "image/heic")
  })

  it("shows the initials fallback (never a broken image) when decoding fails", async () => {
    isHeicMock.mockReturnValue(true)
    getSrcMock.mockRejectedValue(new Error("decode failed"))

    render(
      <WorkerAvatar src="https://x/p.heic" type="image/heic" alt="Maria Piedad" fallback="MP" />,
    )

    expect(await screen.findByText("MP")).toBeInTheDocument()
    // The original (unrenderable) HEIC is never mounted as an <img>.
    expect(screen.queryByRole("img")).toBeNull()
  })
})
