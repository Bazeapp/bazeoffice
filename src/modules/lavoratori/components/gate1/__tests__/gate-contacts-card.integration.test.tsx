/**
 * U6 — GateContactsCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateContactsCard } from "../gate-contacts-card";

type FormValues = {
  followup_chiamata_idoneita: string;
};

const FOLLOWUP_OPTIONS = [
  { value: "done", label: "Completato" },
  { value: "pending", label: "In attesa" },
];

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: { followup_chiamata_idoneita: "" },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateContactsCard options={FOLLOWUP_OPTIONS} />
      <SimulateFieldChange
        name="followup_chiamata_idoneita"
        testId="set-followup"
        value="Completato"
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

describe("GateContactsCard — Field roll-out", () => {
  it("autosave persiste followup_chiamata_idoneita quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-followup"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        followup_chiamata_idoneita: "Completato",
      });
    });
  });
});
