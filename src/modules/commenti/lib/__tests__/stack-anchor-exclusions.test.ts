import { describe, expect, it } from "vitest"

import { resolveCommentStack } from "../resolve-comment-stack"
import {
  collectStackAnchorExclusions,
  collectStackWatchedEntityRefs,
  stackAnchorExclusionsToRpc,
} from "../stack-anchor-exclusions"

const IDS = {
  famiglia: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  lavoratore: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const

describe("stack anchor exclusions", () => {
  it("collects focus sections only for lavoratore pages", () => {
    const stack = resolveCommentStack({
      focus: { entityType: "lavoratore", entityId: IDS.lavoratore },
      row: { id: IDS.lavoratore, lavoratore_id: IDS.lavoratore },
    })

    expect(collectStackAnchorExclusions(stack)).toEqual([
      { entityType: "lavoratore", entityId: IDS.lavoratore },
    ])
    expect(
      collectStackWatchedEntityRefs(
        { entityType: "lavoratore", entityId: IDS.lavoratore },
        stack,
      ),
    ).toEqual([{ entityType: "lavoratore", entityId: IDS.lavoratore }])
  })

  it("serializes exclusions for descendants RPC payloads", () => {
    expect(
      stackAnchorExclusionsToRpc([
        { entityType: "lavoratore", entityId: IDS.lavoratore },
        { entityType: "famiglia", entityId: IDS.famiglia },
      ]),
    ).toEqual([
      { entity_type: "lavoratore", entity_id: IDS.lavoratore },
      { entity_type: "famiglia", entity_id: IDS.famiglia },
    ])
  })
})
