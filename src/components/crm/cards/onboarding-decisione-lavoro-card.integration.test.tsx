/**
 * Integration tests for `OnboardingDecisioneLavoroSection`.
 *
 * Regression coverage for the audit finding at
 * `docs/audits/audit-draft-resync.md` — Section 2:
 * the two resync `useEffect`s at lines 431/497 used to overwrite every
 * controlled input whenever any `defaults.*` dep changed, wiping the
 * user's in-progress edits when a realtime echo arrived for an unrelated
 * field.
 *
 * The fix is per-field `dirty*Ref` guards (see source file). These tests
 * verify both halves of the contract:
 *   1. During an in-flight edit, an unrelated `defaults.*` change must
 *      NOT overwrite the user's value.
 *   2. After the save settles, the field must accept future server
 *      resyncs (so concurrent remote edits aren't permanently masked).
 *
 * Free-text inputs are wrapped in `DebouncedInput`/`DebouncedTextarea`,
 * which already have their own internal `hasUserEditedRef` guard
 * (see `use-debounced-save.ts`), so the explicit dirty refs in this
 * component cover the controls WITHOUT an internal guard: checkboxes
 * (`CheckboxChip`), `RadioGroup`, `Select`, `Combobox`.
 */
import * as React from "react"
import { act, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import {
  OnboardingDecisioneLavoroSection,
  type OnboardingDecisioneLavoroCheckboxDefaults,
} from "@/components/crm/cards/onboarding-decisione-lavoro-card"

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

    // User clicks the checkbox — optimistic update fires, patchProcess
    // is in flight.
    await act(async () => {
      fireEvent.click(neonati)
    })
    expect(neonati.getAttribute("aria-checked")).toBe("true")
    expect(onPatchProcess).toHaveBeenCalledWith({ presenza_neonati: true })

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

    // Without the dirty-ref guard, the resync effect would replace
    // `persistedCheckboxes` and reset `presenza_neonati` to false.
    expect(neonati.getAttribute("aria-checked")).toBe("true")

    // After the save resolves, the dirty flag clears and a NEW resync
    // (with the true value reflected on the server) flows through.
    await act(async () => {
      resolvePatch()
      await patchPromise
    })

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

    // And a subsequent remote toggle DOES resync (no permanent masking).
    rerender(
      <OnboardingDecisioneLavoroSection
        defaults={{
          ...initialDefaults,
          presenzaNeonati: false,
          nucleoFamigliare: "famiglia A (edited remotely)",
        }}
        checkboxDefaults={{}}
        onPatchProcess={onPatchProcess}
      />,
    )
    expect(neonati.getAttribute("aria-checked")).toBe("false")

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
    expect(onPatchProcess).toHaveBeenCalledWith({ richiesta_trasferte: true })

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
})
