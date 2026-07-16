import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/lib/heic-image", () => ({
  isHeicImage: vi.fn(),
  getRenderableImageSrc: vi.fn(),
}))

import { getRenderableImageSrc, isHeicImage } from "@/lib/heic-image"
import { EnlargeableAvatar } from "./enlargeable-avatar"

const isHeicMock = isHeicImage as unknown as Mock
const getSrcMock = getRenderableImageSrc as unknown as Mock

const PHOTO_URL = "https://x/maria.jpg"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a plain renderable photo (no HEIC decoding path).
  isHeicMock.mockReturnValue(false)
})

describe("EnlargeableAvatar", () => {
  it("renders a click target for a real, renderable photo, with no dialog until clicked", () => {
    render(
      <EnlargeableAvatar
        hasPhoto
        src={PHOTO_URL}
        type="image/jpeg"
        alt="Maria Piedad"
        fallback="MP"
      />,
    )

    expect(
      screen.getByRole("button", { name: /ingrandisci foto di maria piedad/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the photo full-screen on click", async () => {
    const user = userEvent.setup()
    render(
      <EnlargeableAvatar hasPhoto src={PHOTO_URL} type="image/jpeg" alt="Maria Piedad" fallback="MP" />,
    )

    await user.click(screen.getByRole("button", { name: /ingrandisci/i }))

    await screen.findByRole("dialog")
    const img = screen.getByRole("img", { name: "Maria Piedad" })
    expect(img).toHaveAttribute("src", PHOTO_URL)
  })

  it("closes on Escape", async () => {
    const user = userEvent.setup()
    render(
      <EnlargeableAvatar hasPhoto src={PHOTO_URL} type="image/jpeg" alt="Maria Piedad" fallback="MP" />,
    )

    await user.click(screen.getByRole("button", { name: /ingrandisci/i }))
    await screen.findByRole("dialog")

    await user.keyboard("{Escape}")

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("closes via the X button", async () => {
    const user = userEvent.setup()
    render(
      <EnlargeableAvatar hasPhoto src={PHOTO_URL} type="image/jpeg" alt="Maria Piedad" fallback="MP" />,
    )

    await user.click(screen.getByRole("button", { name: /ingrandisci/i }))
    await screen.findByRole("dialog")

    await user.click(screen.getByRole("button", { name: /chiudi/i }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("is inert when there is no real photo, even with a non-empty (placeholder) src", async () => {
    // Regression for BAZ-38: `immagineUrl` is never empty — it falls back to a
    // default-avatar asset — so a photo-less worker still has a renderable src.
    // The avatar must NOT be clickable.
    const user = userEvent.setup()
    render(
      <EnlargeableAvatar
        hasPhoto={false}
        src="https://x/default-avatar-3.png"
        type="image/png"
        alt="Maria Piedad"
        fallback="MP"
      />,
    )

    expect(screen.queryByRole("button")).toBeNull()

    await user.click(screen.getByText("MP"))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("is inert with a null or whitespace-only src", () => {
    const { rerender } = render(
      <EnlargeableAvatar hasPhoto src={null} type={null} alt="Maria Piedad" fallback="MP" />,
    )
    expect(screen.queryByRole("button")).toBeNull()

    rerender(
      <EnlargeableAvatar hasPhoto src="   " type={null} alt="Maria Piedad" fallback="MP" />,
    )
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("routes a HEIC photo through conversion and enlarges the converted image", async () => {
    const user = userEvent.setup()
    isHeicMock.mockReturnValue(true)
    getSrcMock.mockResolvedValue("blob:converted")

    render(
      <EnlargeableAvatar hasPhoto src="https://x/maria.heic" type="image/heic" alt="Maria Piedad" fallback="MP" />,
    )

    await user.click(screen.getByRole("button", { name: /ingrandisci/i }))

    await screen.findByRole("dialog")
    const img = await screen.findByRole("img", { name: "Maria Piedad" })
    expect(img).toHaveAttribute("src", "blob:converted")
  })

  it("degrades to the download fallback in the lightbox when a HEIC photo can't be decoded", async () => {
    const user = userEvent.setup()
    isHeicMock.mockReturnValue(true)
    getSrcMock.mockRejectedValue(new Error("decode failed"))

    render(
      <EnlargeableAvatar hasPhoto src="https://x/maria.heic" type="image/heic" alt="Maria Piedad" fallback="MP" />,
    )

    await user.click(screen.getByRole("button", { name: /ingrandisci/i }))
    await screen.findByRole("dialog")

    // Never a broken image: the reused AttachmentImage shows "Scarica / apri".
    const link = await screen.findByRole("link", { name: /scarica \/ apri/i })
    expect(link).toHaveAttribute("href", "https://x/maria.heic")
    expect(screen.queryByRole("img")).toBeNull()
  })
})
