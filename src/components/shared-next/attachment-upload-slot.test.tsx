import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

// Keep real HEIC detection (isHeicImage / isDisplayableImage), stub only the
// network-bound conversion so HEIC thumbnails stay in the loading state.
vi.mock("@/lib/heic-image", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/heic-image")>()),
  getRenderableImageSrc: vi.fn(() => new Promise<string>(() => {})),
}))

import { AttachmentUploadSlot } from "./attachment-upload-slot"

function makeValue(name: string, type: string) {
  return [{ name, path: `baze-bucket/documenti_lavoratori/w1/${name}`, type }]
}

const noop = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AttachmentUploadSlot HEIC preview", () => {
  it("treats a HEIC file as a previewable image (zoom button appears, no broken img)", () => {
    render(
      <AttachmentUploadSlot
        label="Documento"
        value={makeValue("doc.heic", "image/heic")}
        onAdd={noop}
        onPreviewOpen={noop}
        isUploading={false}
      />,
    )

    expect(screen.getByRole("button", { name: /ingrandisci/i })).toBeInTheDocument()
    // The HEIC thumbnail is in the decode/loading state — never a raw <img>.
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("opens the preview with the HEIC link when the zoom button is clicked", () => {
    const onPreviewOpen = vi.fn()
    render(
      <AttachmentUploadSlot
        label="Documento"
        value={makeValue("doc.heic", "image/heic")}
        onAdd={noop}
        onPreviewOpen={onPreviewOpen}
        isUploading={false}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /ingrandisci/i }))

    expect(onPreviewOpen).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/heic", url: expect.stringContaining("doc.heic") }),
    )
  })

  it("still renders a normal image thumbnail (regression)", () => {
    render(
      <AttachmentUploadSlot
        label="Documento"
        value={makeValue("photo.jpg", "image/jpeg")}
        onAdd={noop}
        onPreviewOpen={noop}
        isUploading={false}
      />,
    )

    const img = screen.getByRole("img", { name: "photo.jpg" })
    expect(img.getAttribute("src")).toContain("photo.jpg")
    expect(screen.getByRole("button", { name: /ingrandisci/i })).toBeInTheDocument()
  })

  it("shows no preview for a non-image file like a PDF (regression)", () => {
    render(
      <AttachmentUploadSlot
        label="Documento"
        value={makeValue("scan.pdf", "application/pdf")}
        onAdd={noop}
        onPreviewOpen={noop}
        isUploading={false}
      />,
    )

    expect(screen.queryByRole("button", { name: /ingrandisci/i })).toBeNull()
    expect(screen.queryByRole("img")).toBeNull()
  })
})
