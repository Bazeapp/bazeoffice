/**
 * U6 — GateContactsCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateContactsCard } from "../gate-contacts-card";

type FormValues = {
  followup_chiamata_idoneita: string;
  documenti_in_regola?: string;
};

const FOLLOWUP_OPTIONS = [
  {
    value: "prima_chiamata_senza_risposta",
    label: "1° chiamata senza risposta",
  },
  {
    value: "seconda_chiamata_senza_risposta",
    label: "2° chiamata senza risposta",
  },
  {
    value: "terza_chiamata_senza_risposta",
    label: "3° chiamata senza risposta",
  },
];

function Harness({
  onSave,
  defaults = { followup_chiamata_idoneita: "" },
  debounceMs = 10,
}: {
  onSave: (patch: Partial<FormValues>) => void;
  defaults?: FormValues;
  debounceMs?: number;
}) {
  const form = useAutoSaveForm<FormValues>({
    defaults,
    onSave,
    debounceMs,
  });

  return (
    <Form {...form}>
      <GateContactsCard options={FOLLOWUP_OPTIONS} />
    </Form>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GateContactsCard — Field roll-out", () => {
  it("autosave persiste followup_chiamata_idoneita quando l'utente clicca il radio", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(
      screen.getByRole("radio", { name: "1° chiamata senza risposta" }),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        followup_chiamata_idoneita: "1° chiamata senza risposta",
      });
    });
  });

  it("persiste il followup anche se defaults collaterali cambiano prima del flush", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <Harness
        onSave={onSave}
        debounceMs={50}
        defaults={{
          followup_chiamata_idoneita: "",
          documenti_in_regola: "",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: "1° chiamata senza risposta" }),
    );

    // Lookup / sibling field land before debounce flush → form.reset().
    rerender(
      <Harness
        onSave={onSave}
        debounceMs={50}
        defaults={{
          followup_chiamata_idoneita: "",
          documenti_in_regola: "in_regola",
        }}
      />,
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        followup_chiamata_idoneita: "1° chiamata senza risposta",
      });
    });
  });
});
