import { describe, expect, it } from "vitest"

import { buildAvailabilityPatchFromMatrix } from "../availability-utils"

describe("buildAvailabilityPatchFromMatrix", () => {
  it("writes only day/band boolean fields — never availability_final_json", () => {
    const patch = buildAvailabilityPatchFromMatrix({
      "lunedi:mattina": true,
      "martedi:pomeriggio": true,
      "mercoledi:sera": false,
    })

    expect(patch).toMatchObject({
      disponibilita_lunedi_mattina: true,
      disponibilita_martedi_pomeriggio: true,
      disponibilita_mercoledi_sera: false,
      disponibilita_lunedi_pomeriggio: false,
    })
    expect(patch).not.toHaveProperty("availability_final_json")
  })
})
