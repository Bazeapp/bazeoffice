/**
 * Integration tests for `OnboardingDecisioneLavoroSection`.
 *
 * Regression coverage for the audit finding at
 * `docs/audits/audit-draft-resync.md` — Section 2:
 * the two resync `useEffect`s used to overwrite every controlled input
 * whenever any `defaults.*` dep changed, wiping the user's in-progress edits
 * when a realtime echo arrived for an unrelated field.
 *
 * FASE 5 BIS — the section now uses react-hook-form + `useAutoSaveForm`
 * (the form is the source of truth). The anti-clobber contract is enforced by
 * `form.reset(defaults, { keepDirtyValues: true })`: a field the user has
 * touched is never overwritten by an incoming `defaults.*` change while dirty.
 * After a successful autosave, RHF dirty is cleared via `keepValues` reset so
 * a later remote change to that same field can land (R2) — keepDirtyValues
 * protects in-progress edits only, not post-save fields.
 *
 * These tests verify the core contract: the optimistic value is applied
 * immediately, the save fires, an unrelated realtime echo does NOT wipe
 * the in-progress edit, and after save a remote update to the same field lands.
 */
import * as React from "react"
import { act, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import {
  OnboardingDecisioneLavoroSection,
  type OnboardingDecisioneLavoroCheckboxDefaults,
} from "../onboarding-decisione-lavoro-card"

type Defaults = NonNullable<
  React.ComponentProps<typeof OnboardingDecisioneLavoroSection>
>["defaults"]

function setup(props: {
  defaults?: Defaults
  checkboxDefaults?: OnboardingDecisioneLavoroCheckboxDefaults
  onPatchProcess?: (patch: Record<string, unknown>) => Promise<void>
}) {
  return renderWithProviders(
    <OnboardingDecisioneLavoroSection
      defaults={props.defaults ?? {}}
      checkboxDefaults={props.checkboxDefaults ?? {}}
      onPatchProcess={props.onPatchProcess ?? (async () => {})}
    />,
  )
}

describe("OnboardingDecisioneLavoroSection draft resync guards", () => {
  it("does not reset a freshly toggled checkbox when an unrelated defaults.* changes", async () => {
    // Deferred patch promise so the optimistic update is "in flight" when
    // the realtime echo arrives — exactly the race the audit describes.
    let resolvePatch: () => void = () => {}
    const patchPromise = new Promise<void>((resolve) => {
      resolvePatch = resolve
    })
    const onPatchProcess = vi.fn(async () => {
      await patchPromise
    })

    const initialDefaults: Defaults = {
      presenzaNeonati: false,
      piuBambini: false,
      nucleoFamigliare: "famiglia A",
    }

    const { getByRole, rerender, queryClient } = setup({
      defaults: initialDefaults,
      onPatchProcess,
    })

    const neonati = getByRole("checkbox", { name: "Sono presenti neonati" })
    expect(neonati.getAttribute("aria-checked")).toBe("false")

    // User clicks the checkbox — the form value flips immediately (optimistic),
    // the autosave fires on the next tick.
    await act(async () => {
      fireEvent.click(neonati)
    })
    expect(neonati.getAttribute("aria-checked")).toBe("true")
    await waitFor(() =>
      expect(onPatchProcess).toHaveBeenCalledWith({ presenza_neonati: true }),
    )

    // BEFORE the save settles, a realtime echo arrives for an UNRELATED
    // field. The whole `defaults` object identity changes, but
    // `presenzaNeonati` is still false on the server (the optimistic
    // update hasn't round-tripped yet).
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          ...initialDefaults,
          nucleoFamigliare: "famiglia A (edited remotely)",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )

    // keepDirtyValues keeps the touched checkbox pinned to the user's value.
    expect(neonati.getAttribute("aria-checked")).toBe("true")

    await act(async () => {
      resolvePatch()
      await patchPromise
    })

    // The server now reflects the saved value — the field stays consistent.
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          ...initialDefaults,
          presenzaNeonati: true,
          nucleoFamigliare: "famiglia A (edited remotely)",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )
    expect(neonati.getAttribute("aria-checked")).toBe("true")

    queryClient.clear()
  })

  it("does not reset a freshly toggled boolean (richiestaTrasferte) when an unrelated defaults.* changes", async () => {
    let resolvePatch: () => void = () => {}
    const patchPromise = new Promise<void>((resolve) => {
      resolvePatch = resolve
    })
    const onPatchProcess = vi.fn(async () => {
      await patchPromise
    })

    const initialDefaults: Defaults = {
      richiestaTrasferte: false,
      richiestaFerie: false,
      mansioniRichieste: "pulizie",
    }

    const { getByRole, rerender, queryClient } = setup({
      defaults: initialDefaults,
      onPatchProcess,
    })

    const trasferte = getByRole("checkbox", { name: "Trasferte richieste" })
    expect(trasferte.getAttribute("aria-checked")).toBe("false")

    await act(async () => {
      fireEvent.click(trasferte)
    })
    expect(trasferte.getAttribute("aria-checked")).toBe("true")
    await waitFor(() =>
      expect(onPatchProcess).toHaveBeenCalledWith({ richiesta_trasferte: true }),
    )

    // Realtime echo on an unrelated field.
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          ...initialDefaults,
          mansioniRichieste: "pulizie + cucina",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )
    expect(trasferte.getAttribute("aria-checked")).toBe("true")

    await act(async () => {
      resolvePatch()
      await patchPromise
    })
    queryClient.clear()
  })

  it("after autosave, a remote change to the same field updates the UI", async () => {
    // Pins R2 for CRM pipeline cards: keepDirtyValues must not freeze a field
    // forever after save. useAutoSaveFormFields clears dirty via keepValues.
    // Model the production path: optimistic/server echo advances defaults to the
    // saved value first (signature change), then a later peer update can land.
    const onPatchProcess = vi.fn(async () => {})

    const { getByRole, rerender, queryClient } = setup({
      defaults: {
        presenzaNeonati: false,
        nucleoFamigliare: "famiglia A",
      },
      onPatchProcess,
    })

    const neonati = getByRole("checkbox", { name: "Sono presenti neonati" })
    await act(async () => {
      fireEvent.click(neonati)
    })
    expect(neonati.getAttribute("aria-checked")).toBe("true")
    await waitFor(() =>
      expect(onPatchProcess).toHaveBeenCalledWith({ presenza_neonati: true }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    // Optimistic / server echo of our own save.
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          presenzaNeonati: true,
          nucleoFamigliare: "famiglia A",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )
    expect(neonati.getAttribute("aria-checked")).toBe("true")

    // Later peer remote change — must apply because dirty was cleared after save.
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          presenzaNeonati: false,
          nucleoFamigliare: "famiglia A",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )

    expect(neonati.getAttribute("aria-checked")).toBe("false")
    queryClient.clear()
  })
})
