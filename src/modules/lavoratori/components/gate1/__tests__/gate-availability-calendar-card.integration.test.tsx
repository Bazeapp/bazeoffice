/**
 * U6 — AvailabilityCalendarCard vincoli Field roll-out (parent form).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { AvailabilityCalendarCard } from "../../availability-calendar-card";

type FormValues = {
  vincoli_orari_disponibilita: string;
};

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: { vincoli_orari_disponibilita: "" },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <AvailabilityCalendarCard
        titleMeta="aggiornato oggi"
        isEditing
        isUpdating={false}
        editDays={[{ field: "lun", label: "Lun" }]}
        editBands={[{ field: "mattina", label: "Mattina" }]}
        hourLabels={["08:00"]}
        readOnlyRows={[]}
        matrix={{}}
        vincoliPersistMode="parent-form"
        onToggleEdit={() => undefined}
        onMatrixChange={() => undefined}
      />
      <SimulateFieldChange
        name="vincoli_orari_disponibilita"
        testId="set-vincoli"
        value="Disponibile lun-ven 09:00-18:00"
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

describe("AvailabilityCalendarCard — vincoli parent-form", () => {
  it("autosave persiste vincoli_orari_disponibilita quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-vincoli"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        vincoli_orari_disponibilita: "Disponibile lun-ven 09:00-18:00",
      });
    });
  });
});
