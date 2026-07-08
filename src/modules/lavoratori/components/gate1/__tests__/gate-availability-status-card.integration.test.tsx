/**
 * U6 — AvailabilityStatusCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { AvailabilityStatusCard } from "../../availability-status-card";

type FormValues = {
  disponibilita: string;
  data_ritorno_disponibilita: string;
};

const DISPONIBILITA_OPTIONS = [
  { value: "disponibile", label: "Disponibile" },
  { value: "non_disponibile", label: "Non disponibile" },
];

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      disponibilita: "",
      data_ritorno_disponibilita: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <AvailabilityStatusCard
        isEditing
        isUpdating={false}
        disponibilitaOptions={DISPONIBILITA_OPTIONS}
        selectedDisponibilitaBadgeClassName=""
        onToggleEdit={() => undefined}
      />
      <SimulateFieldChange
        name="disponibilita"
        testId="set-disponibilita"
        value="Disponibile"
      />
      <SimulateFieldChange
        name="data_ritorno_disponibilita"
        testId="set-ritorno"
        value="2026-08-01"
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

describe("AvailabilityStatusCard — Field roll-out", () => {
  it("autosave persiste disponibilita quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-disponibilita"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ disponibilita: "Disponibile" });
    });
  });

  it("autosave persiste data_ritorno_disponibilita quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-ritorno"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        data_ritorno_disponibilita: "2026-08-01",
      });
    });
  });
});
