import { describe, expect, it } from "vitest"

import { readComputedAvailabilityFinalJson } from "../availability-functions"

describe("readComputedAvailabilityFinalJson", () => {
  it("stringifies the matching worker result", () => {
    const weekly = { mon: [{ from: "09:30", to: "14:00" }] }
    const value = readComputedAvailabilityFinalJson(
      {
        results: [
          {
            worker_id: "worker-1",
            result: { availability_final_json: { weekly } },
          },
        ],
      },
      "worker-1"
    )

    expect(value).toBe(JSON.stringify({ weekly }))
  })

  it("returns null on error entries or missing payload", () => {
    expect(
      readComputedAvailabilityFinalJson(
        { results: [{ worker_id: "worker-1", error: "boom" }] },
        "worker-1"
      )
    ).toBeNull()
    expect(readComputedAvailabilityFinalJson(null, "worker-1")).toBeNull()
  })
})
