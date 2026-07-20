import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import type { CommentSection } from "../../types/section"
import type { EntityRef } from "../../types/entity"
import { CommentTargetChip } from "../comment-target-chip"

const TARGET: EntityRef = {
  entityType: "lavoratore",
  entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
}

const OPTIONS: EntityRef[] = [
  TARGET,
  {
    entityType: "famiglia",
    entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
]

const SECTIONS: CommentSection[] = [
  {
    id: "lavoratore:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    kind: "focus",
    entityRef: TARGET,
    typeLabel: "LAVORATORE",
    displayName: "Jane Doe",
    icon: "👤",
  },
  {
    id: "famiglia:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "ancestor",
    entityRef: OPTIONS[1]!,
    typeLabel: "FAMIGLIA",
    displayName: "Famiglia Rossi",
    icon: "🏠",
  },
]

describe("CommentTargetChip", () => {
  it("opens the target menu above the comments panel stacking layer", async () => {
    const user = userEvent.setup()
    const onTargetChange = vi.fn()

    renderWithProviders(
      <CommentTargetChip
        target={TARGET}
        options={OPTIONS}
        sections={SECTIONS}
        onTargetChange={onTargetChange}
      />,
    )

    await user.click(screen.getByTestId("comments-target-chip"))

    const option = await screen.findByTestId("comments-target-option-famiglia")
    const menu = option.closest("[data-radix-menu-content], [role='menu']")
    expect(menu).toBeTruthy()
    expect(menu).toHaveClass("z-110")
  })
})
