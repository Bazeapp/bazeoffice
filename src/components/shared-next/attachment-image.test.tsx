import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

vi.mock("@/lib/heic-image", () => ({
  isHeicImage: vi.fn(),
  getRenderableImageSrc: vi.fn(),
}))

import { getRenderableImageSrc, isHeicImage } from "@/lib/heic-image"
import { AttachmentImage } from "./attachment-image"

const isHeicMock = isHeicImage as unknown as Mock
const getSrcMock = getRenderableImageSrc as unknown as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AttachmentImage", () => {
  it("renders a renderable image immediately without decoding", () => {
    isHeicMock.mockReturnValue(false)

    render(<AttachmentImage src="https://x/y.jpg" type="image/jpeg" alt="Documento" />)

    const img = screen.getByRole("img", { name: "Documento" })
    expect(img).toHaveAttribute("src", "https://x/y.jpg")
    expect(getSrcMock).not.toHaveBeenCalled()
  })

  it("shows a loading state, then the converted image, for HEIC", async () => {
    isHeicMock.mockReturnValue(true)
    let resolve!: (value: string) => void
    getSrcMock.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r
      }),
    )

    const { container } = render(
      <AttachmentImage src="https://x/doc.heic" type="image/heic" alt="Documento" />,
    )

    // Loading: spinner present, no image yet.
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole("img")).toBeNull()
    expect(getSrcMock).toHaveBeenCalledWith("https://x/doc.heic", "image/heic")

    resolve("blob:converted")

    const img = await screen.findByRole("img", { name: "Documento" })
    expect(img).toHaveAttribute("src", "blob:converted")
  })

  it("shows a download fallback (no broken image) when decoding fails", async () => {
    isHeicMock.mockReturnValue(true)
    getSrcMock.mockRejectedValue(new Error("decode failed"))

    render(
      <AttachmentImage
        src="https://x/doc.heic"
        type="image/heic"
        alt="Documento"
        downloadName="doc.heic"
      />,
    )

    const link = await screen.findByRole("link", { name: /scarica \/ apri/i })
    expect(link).toHaveAttribute("href", "https://x/doc.heic")
    expect(screen.getByText("doc.heic")).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("falls back to the download link when a ready <img> fails to load", async () => {
    isHeicMock.mockReturnValue(false)

    render(
      <AttachmentImage
        src="https://x/gone.jpg"
        type="image/jpeg"
        alt="Documento"
        downloadName="gone.jpg"
      />,
    )

    const img = screen.getByRole("img", { name: "Documento" })
    fireEvent.error(img)

    const link = await screen.findByRole("link", { name: /scarica \/ apri/i })
    expect(link).toHaveAttribute("href", "https://x/gone.jpg")
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("does not update state after unmount when a decode resolves late", async () => {
    isHeicMock.mockReturnValue(true)
    let resolve!: (value: string) => void
    getSrcMock.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r
      }),
    )
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { unmount } = render(
      <AttachmentImage src="https://x/doc.heic" type="image/heic" alt="Documento" />,
    )
    unmount()
    resolve("blob:late")
    await new Promise((r) => setTimeout(r, 0))

    // The `active` guard suppresses the post-unmount setState; React would log
    // a warning through console.error if it fired.
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
