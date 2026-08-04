import { describe, expect, it, vi } from "vitest"

import {
  requestOpenCommentPanel,
  subscribeOpenCommentPanel,
} from "../open-comment-panel"

describe("open-comment-panel", () => {
  it("notifies subscribers when open is requested", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeOpenCommentPanel(listener)

    requestOpenCommentPanel()

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    requestOpenCommentPanel()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
