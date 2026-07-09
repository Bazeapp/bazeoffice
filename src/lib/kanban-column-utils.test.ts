import { describe, expect, it } from "vitest"

import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"

describe("getKanbanColumnVisual", () => {
  it("maps known palette tokens", () => {
    expect(getKanbanColumnVisual("sky")).toEqual({
      columnClassName: "bg-sky-400",
      headerClassName: "",
      iconClassName: "text-sky-500",
    })
  })

  it("returns the default visual for unknown tokens", () => {
    expect(getKanbanColumnVisual("unknown")).toEqual({
      columnClassName: "",
      headerClassName: "",
      iconClassName: "text-muted-foreground/80",
    })
  })
})
