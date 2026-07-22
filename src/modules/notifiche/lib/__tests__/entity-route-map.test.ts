import { describe, expect, it } from "vitest"

import {
  applyRoutePatch,
  buildNotificationDeepLinkUrl,
  buildUrlWithComment,
  isBoardEntityType,
  readBoardEntityIdFromSearch,
  readCommentIdFromSearch,
  routePatchFromCommentNavigation,
} from "../entity-route-map"
import type { CommentNavigation } from "../../types"

function nav(
  partial: Partial<CommentNavigation> &
    Pick<CommentNavigation, "entityType" | "entityId">,
): CommentNavigation {
  return {
    commentId: "11111111-1111-4111-8111-111111111111",
    threadRootId: "11111111-1111-4111-8111-111111111111",
    ricercaId: null,
    rapportoId: null,
    lavoratoreId: null,
    famigliaId: null,
    ...partial,
  }
}

describe("routePatchFromCommentNavigation", () => {
  it("maps ricerca and candidatura to ricerca detail routes", () => {
    expect(
      routePatchFromCommentNavigation(
        nav({
          entityType: "ricerca",
          entityId: "22222222-2222-4222-8222-222222222222",
        }),
      ),
    ).toMatchObject({
      mainSection: "ricerca_pipeline",
      ricercaProcessId: "22222222-2222-4222-8222-222222222222",
    })

    expect(
      routePatchFromCommentNavigation(
        nav({
          entityType: "candidatura",
          entityId: "33333333-3333-4333-8333-333333333333",
          ricercaId: "22222222-2222-4222-8222-222222222222",
        }),
      ),
    ).toMatchObject({
      mainSection: "ricerca_pipeline",
      ricercaProcessId: "22222222-2222-4222-8222-222222222222",
      ricercaSelectionId: "33333333-3333-4333-8333-333333333333",
    })
  })

  it("maps rapporto and assunzione detail ids", () => {
    expect(
      routePatchFromCommentNavigation(
        nav({
          entityType: "rapporto",
          entityId: "44444444-4444-4444-8444-444444444444",
        }),
      ).selectedRapportoId,
    ).toBe("44444444-4444-4444-8444-444444444444")

    expect(
      routePatchFromCommentNavigation(
        nav({
          entityType: "assunzione",
          entityId: "55555555-5555-4555-8555-555555555555",
          rapportoId: "44444444-4444-4444-8444-444444444444",
        }),
      ).selectedAssunzioneRapportoId,
    ).toBe("44444444-4444-4444-8444-444444444444")
  })

  it("maps board-only entities to list surfaces", () => {
    expect(
      routePatchFromCommentNavigation(
        nav({ entityType: "cedolino", entityId: "66666666-6666-4666-8666-666666666666" }),
      ).mainSection,
    ).toBe("payroll_cedolini")

    expect(
      routePatchFromCommentNavigation(
        nav({ entityType: "contributi", entityId: "77777777-7777-4777-8777-777777777777" }),
      ).mainSection,
    ).toBe("payroll_contributi_inps")

    expect(
      routePatchFromCommentNavigation(
        nav({ entityType: "famiglia", entityId: "88888888-8888-4888-8888-888888888888" }),
      ).mainSection,
    ).toBe("crm_pipeline_famiglie")
  })
})

describe("notification deep-link query helpers", () => {
  it("reads and builds ?comment=", () => {
    expect(readCommentIdFromSearch("?comment=abc")).toBe("abc")
    expect(buildUrlWithComment("/ricerca/x", "abc")).toBe("/ricerca/x?comment=abc")
    expect(buildUrlWithComment("/ricerca/x", null)).toBe("/ricerca/x")
  })

  it("builds board-entity search params for famiglia, cedolino and contributi", () => {
    expect(
      buildNotificationDeepLinkUrl("/pipeline", {
        entityType: "famiglia",
        entityId: "fam-1",
        commentId: "c1",
      }),
    ).toBe("/pipeline?famiglia=fam-1&comment=c1")

    expect(
      buildNotificationDeepLinkUrl("/payroll/cedolini", {
        entityType: "cedolino",
        entityId: "ced-1",
      }),
    ).toBe("/payroll/cedolini?cedolino=ced-1")

    expect(
      buildNotificationDeepLinkUrl("/payroll/contributi-inps", {
        entityType: "contributi",
        entityId: "con-1",
        commentId: "c2",
      }),
    ).toBe("/payroll/contributi-inps?contributi=con-1&comment=c2")

    expect(
      buildNotificationDeepLinkUrl("/ricerca/x", {
        entityType: "ricerca",
        entityId: "r1",
        commentId: "c3",
      }),
    ).toBe("/ricerca/x?comment=c3")
  })

  it("reads board entity ids from search", () => {
    expect(isBoardEntityType("famiglia")).toBe(true)
    expect(isBoardEntityType("ricerca")).toBe(false)
    expect(readBoardEntityIdFromSearch("famiglia", "?famiglia=fam-1&comment=c1")).toBe(
      "fam-1",
    )
    expect(readBoardEntityIdFromSearch("cedolino", "?cedolino=ced-1")).toBe("ced-1")
    expect(readBoardEntityIdFromSearch("contributi", "?contributi=con-1")).toBe("con-1")
    expect(readBoardEntityIdFromSearch("famiglia", "")).toBeNull()
  })

  it("applyRoutePatch merges without dropping unrelated fields", () => {
    const next = applyRoutePatch(
      {
        mainSection: "anagrafiche",
        anagraficheTab: "famiglie",
        ricercaProcessId: null,
        selectedWorkerId: "w1",
      },
      {
        mainSection: "ricerca_pipeline",
        ricercaProcessId: "p1",
      },
    )
    expect(next.mainSection).toBe("ricerca_pipeline")
    expect(next.ricercaProcessId).toBe("p1")
    expect(next.selectedWorkerId).toBe("w1")
  })
})
