import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import { CommentComposer } from "../comment-composer"
import { CommentBody } from "../comment-body"

const OPERATORS = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    label: "Mario Rossi",
    avatar: "MR",
    avatarBorderClassName: "after:border-emerald-500",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    label: "Luigi Bianchi",
    avatar: "LB",
    avatarBorderClassName: "after:border-sky-500",
  },
]

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({
    options: OPERATORS,
    loading: false,
    error: null,
  }),
}))

describe("Mention autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("inserts mention markup when selecting an operator", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(
      <CommentComposer
        placeholder="Scrivi…"
        involvedOperatorIds={[OPERATORS[0]!.id]}
        onSubmit={onSubmit}
      />,
    )

    const input = screen.getByTestId("comments-composer-input")
    await user.type(input, "Ciao @")

    const autocomplete = await screen.findByTestId("comments-mention-autocomplete")
    expect(within(autocomplete).getByText("In questo contesto")).toBeInTheDocument()
    expect(within(autocomplete).getByText("Tutti gli operatori")).toBeInTheDocument()

    await user.click(screen.getByTestId(`comments-mention-option-${OPERATORS[1]!.id}`))

    expect(input).toHaveValue(
      `Ciao @[Luigi Bianchi](${OPERATORS[1]!.id})`,
    )
  })

  it("renders mention markup as blue highlighted spans", () => {
    renderWithProviders(
      <CommentBody body={`Salve @[Mario Rossi](${OPERATORS[0]!.id})`} />,
    )

    const highlight = screen.getByTestId("comments-mention-highlight")
    expect(highlight).toHaveTextContent("@Mario Rossi")
    expect(highlight).toHaveClass("text-blue-600")
  })
})

describe("CommentComposer mention keyboard", () => {
  it("submits with cmd+enter without selecting a mention", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <CommentComposer placeholder="Scrivi…" onSubmit={onSubmit} />,
    )

    const input = screen.getByTestId("comments-composer-input")
    fireEvent.change(input, { target: { value: "Test invio" } })
    fireEvent.keyDown(input, { key: "Enter", metaKey: true })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("Test invio")
    })
  })
})
