/**
 * U6 — DocumentsCard parent-form roll-out (lookup + NASPI via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { DocumentsCard } from "../../documents-card";

type FormValues = {
  stato_verifica_documenti: string;
  documenti_in_regola: string;
  data_scadenza_naspi_doc: string;
};

const LOOKUP_OPTIONS = [{ label: "Si", value: "si" }];

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      stato_verifica_documenti: "",
      documenti_in_regola: "",
      data_scadenza_naspi_doc: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <DocumentsCard
        workerId="worker-1"
        isEditing
        isUpdating={false}
        draft={{
          stato_verifica_documenti: "",
          documenti_in_regola: "",
          data_scadenza_naspi: "",
          iban: "",
          id_stripe_account: "",
        }}
        selectedValues={{
          stato_verifica_documenti: "",
          documenti_in_regola: "",
          data_scadenza_naspi: "",
        }}
        documents={[]}
        documentsLoading={false}
        verificationOptions={LOOKUP_OPTIONS}
        statoDocumentiOptions={LOOKUP_OPTIONS}
        lookupColorsByDomain={new Map()}
        documentsPersistMode="parent-form"
        onToggleEdit={() => undefined}
        onDocumentUpsert={vi.fn()}
        onUploadError={vi.fn()}
      />
      <SimulateFieldChange
        name="stato_verifica_documenti"
        testId="set-verifica"
        value="si"
      />
      <SimulateFieldChange
        name="data_scadenza_naspi_doc"
        testId="set-naspi"
        value="2026-12-01"
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

describe("DocumentsCard — parent-form", () => {
  it("autosave persiste stato_verifica_documenti quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-verifica"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ stato_verifica_documenti: "si" });
    });
  });

  it("autosave persiste data_scadenza_naspi_doc quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-naspi"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        data_scadenza_naspi_doc: "2026-12-01",
      });
    });
  });
});
