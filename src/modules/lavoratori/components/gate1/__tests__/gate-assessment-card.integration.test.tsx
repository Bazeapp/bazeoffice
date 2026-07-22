/**
 * U6 — GateAssessmentCard Field roll-out (form-backed display + imperative save).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import type { LavoratoreRecord } from "../../../types/lavoratore";
import { Gate1WorkerProvider } from "../gate1-worker-context";
import { GateAssessmentCard } from "../gate-assessment-card";

type FormValues = {
  stato_lavoratore: string;
  motivazione_non_idoneo: string;
};

const mockPatchSelectedWorkerField = vi.fn().mockResolvedValue(undefined);
const mockHandleNonIdoneoReasonsChange = vi.fn().mockResolvedValue(undefined);
const mockRetain = vi.fn();

const mockWorkerRow = {
  id: "worker-1",
  feedback_recruiter: "nota esistente",
} as LavoratoreRecord;

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      stato_lavoratore: "Qualificato",
      motivazione_non_idoneo: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <Gate1WorkerProvider
        editor={{
          patchSelectedWorkerField: mockPatchSelectedWorkerField,
          handleNonIdoneoReasonsChange: mockHandleNonIdoneoReasonsChange,
        } as never}
        workerRow={mockWorkerRow}
        retainSelectedWorkerAfterStatusChange={mockRetain}
      >
        <GateAssessmentCard
          statusOptions={[
            { label: "Qualificato", value: "qualificato" },
            { label: "Idoneo", value: "idoneo" },
          ]}
          nonIdoneoReasonOptions={[]}
          operatorName="Mario Rossi"
          lookupColorsByDomain={new Map()}
        />
        <SimulateFieldChange
          name="stato_lavoratore"
          testId="set-stato"
          value="Idoneo"
        />
      </Gate1WorkerProvider>
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
  value: string;
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

describe("GateAssessmentCard — Field roll-out", () => {
  it("mostra lo stato corrente dal form", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    expect(screen.getByText("Qualificato")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Scrivi un nuovo appunto/)).toBeInTheDocument();
  });

  it("non autosalva stato_lavoratore tramite debounce (salvataggio imperativo)", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-stato"));

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
