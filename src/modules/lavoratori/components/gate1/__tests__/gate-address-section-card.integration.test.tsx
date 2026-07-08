/**
 * U6 — AddressSectionCard parent-form roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { AddressSectionCard } from "../../address-section-card";

type FormValues = {
  via: string;
  civico: string;
  cap: string;
  citta: string;
  provincia: string;
  citofono: string;
};

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const mobilityAnchor = useRef<HTMLDivElement>(null);
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      via: "",
      civico: "",
      cap: "",
      citta: "",
      provincia: "",
      citofono: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <AddressSectionCard
        isEditing
        isUpdating={false}
        provinciaOptions={[{ label: "Torino", value: "TO" }]}
        mobilityOptions={[]}
        mobilityAnchor={mobilityAnchor}
        addressPersistMode="parent-form"
        onToggleEdit={() => undefined}
      />
      <SimulateFieldChange name="via" testId="set-via" value="Via Roma" />
      <SimulateFieldChange name="provincia" testId="set-provincia" value="TO" />
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

describe("AddressSectionCard — parent-form", () => {
  it("autosave persiste via quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-via"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ via: "Via Roma" });
    });
  });

  it("autosave persiste provincia quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-provincia"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ provincia: "TO" });
    });
  });
});
