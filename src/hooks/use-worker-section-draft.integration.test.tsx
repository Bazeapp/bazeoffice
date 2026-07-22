/**
 * Characterization tests for `useWorkerSectionDraft`.
 *
 * Guards the shared worker-editor draft lifecycle:
 *   1. resync when not editing and server row (or resyncDeps) change;
 *   2. preserve draft while `isEditing` is true;
 *   3. skip resync while `activePatchesRef.current > 0`;
 *   4. reset `isEditing` and resync when `selectedWorkerId` changes.
 */
import * as React from "react"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useWorkerSectionDraft } from "@/hooks/use-worker-section-draft"
import type { LavoratoreRecord } from "@/modules/lavoratori/types/lavoratore"

type Draft = { note: string }

function makeRow(id: string, bio: string): LavoratoreRecord {
  return { id, bio_personale: bio } as unknown as LavoratoreRecord
}

type HarnessProps = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatches: number
  extraDep?: string
}

function useHarness({
  selectedWorkerId,
  selectedWorkerRow,
  activePatches,
  extraDep,
}: HarnessProps) {
  const activePatchesRef = React.useRef(activePatches)
  React.useEffect(() => {
    activePatchesRef.current = activePatches
  })
  const [isEditing, setIsEditing] = React.useState(false)
  const buildDraft = React.useCallback(
    (row: LavoratoreRecord | null): Draft => ({
      note: `${row?.bio_personale ?? ""}:${extraDep ?? ""}`,
    }),
    [extraDep]
  )
  const { draft, setDraft } = useWorkerSectionDraft<Draft>({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    isEditing,
    setIsEditing,
    buildDraft,
    resyncDeps: extraDep !== undefined ? [extraDep] : undefined,
  })
  return { draft, setDraft, isEditing, setIsEditing }
}

describe("useWorkerSectionDraft", () => {
  it("resyncs draft when server row changes and not editing", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 0,
      },
    })

    expect(result.current.draft.note).toBe("alpha:")

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 0,
    })

    expect(result.current.draft.note).toBe("beta:")
  })

  it("preserves draft while editing when server row changes", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 0,
      },
    })

    act(() => {
      result.current.setIsEditing(true)
      result.current.setDraft({ note: "user-typed" })
    })

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 0,
    })

    expect(result.current.draft.note).toBe("user-typed")
  })

  it("resyncs after leaving edit mode when server row changed", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 0,
      },
    })

    act(() => {
      result.current.setIsEditing(true)
      result.current.setDraft({ note: "user-typed" })
    })

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 0,
    })

    act(() => {
      result.current.setIsEditing(false)
    })

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 0,
    })

    expect(result.current.draft.note).toBe("beta:")
  })

  it("skips resync while activePatchesRef is non-zero", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 1,
      },
    })

    expect(result.current.draft.note).toBe("alpha:")

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 1,
    })

    expect(result.current.draft.note).toBe("alpha:")
  })

  it("resyncs once activePatchesRef returns to zero", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 1,
      },
    })

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "beta"),
      activePatches: 0,
    })

    expect(result.current.draft.note).toBe("beta:")
  })

  it("resets isEditing and resyncs draft when selectedWorkerId changes", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 0,
      },
    })

    act(() => {
      result.current.setIsEditing(true)
      result.current.setDraft({ note: "user-typed" })
    })

    rerender({
      selectedWorkerId: "w-2",
      selectedWorkerRow: makeRow("w-2", "gamma"),
      activePatches: 0,
    })

    expect(result.current.isEditing).toBe(false)
    expect(result.current.draft.note).toBe("gamma:")
  })

  it("resyncs when resyncDeps change", () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: {
        selectedWorkerId: "w-1",
        selectedWorkerRow: makeRow("w-1", "alpha"),
        activePatches: 0,
        extraDep: "payload-a",
      },
    })

    expect(result.current.draft.note).toBe("alpha:payload-a")

    rerender({
      selectedWorkerId: "w-1",
      selectedWorkerRow: makeRow("w-1", "alpha"),
      activePatches: 0,
      extraDep: "payload-b",
    })

    expect(result.current.draft.note).toBe("alpha:payload-b")
  })
})
