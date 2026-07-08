/**
 * U6 — GateWorkTypesCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateWorkTypesCard } from "../gate-work-types-card";

type FormValues = {
  tipo_lavoro_domestico: string[];
  hai_referenze: string;
  anni_esperienza_colf: string;
};

const ALLOWED_WORK_OPTIONS = [
  { label: "Colf", value: "Colf" },
  { label: "Badante", value: "Badante" },
];

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      tipo_lavoro_domestico: [],
      hai_referenze: "",
      anni_esperienza_colf: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateWorkTypesCard
        workerId="worker-1"
        referenzeOptions={[{ label: "Si", value: "si" }]}
        allowedWorkOptions={ALLOWED_WORK_OPTIONS}
        isEditing
        showReferencesField
        experienceDraft={{ situazione_lavorativa_attuale: "" }}
        experiences={[]}
        experiencesLoading={false}
        references={[]}
        referencesLoading={false}
        lookupColorsByDomain={new Map()}
        experienceTipoLavoroOptions={[]}
        experienceTipoRapportoOptions={[]}
        referenceStatusOptions={[]}
        isUpdatingExperience={false}
        onExperiencePatch={vi.fn()}
        onExperienceCreate={vi.fn()}
        onReferencePatch={vi.fn()}
        onReferenceCreate={vi.fn()}
      />
      <SimulateFieldChange
        name="tipo_lavoro_domestico"
        testId="set-tipo-lavoro"
        value={["Colf"]}
      />
      <SimulateFieldChange
        name="hai_referenze"
        testId="set-hai-referenze"
        value="si"
      />
      <SimulateFieldChange
        name="anni_esperienza_colf"
        testId="set-anni-colf"
        value="5"
      />
    </Form>
  );
}

function SimulateFieldChange({
  name,
  testId,
  value,
}: {
  name: keyof FormValues;
  testId: string;
  value: FormValues[keyof FormValues];
}) {
  const { field } = useController({ name });
  return (
    <button type="button" data-testid={testId} onClick={() => field.onChange(value)}>
      set {name}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GateWorkTypesCard — Field roll-out", () => {
  it("autosave persiste tipo_lavoro_domestico quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-tipo-lavoro"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        tipo_lavoro_domestico: ["Colf"],
      });
    });
  });

  it("autosave persiste hai_referenze quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-hai-referenze"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ hai_referenze: "si" });
    });
  });

  it("autosave persiste anni_esperienza_colf quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-anni-colf"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ anni_esperienza_colf: "5" });
    });
  });
});
