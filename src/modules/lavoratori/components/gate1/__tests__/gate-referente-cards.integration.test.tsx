/**
 * U6 — Gate referente cards Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import {
  GateCertificationReferenteCard,
  GateReferenteCard,
} from "../gate-referente-cards";

type FormValues = {
  referente_idoneita_id: string;
  referente_certificazione_id: string;
};

const OPERATOR_OPTIONS = [
  {
    id: "op-1",
    label: "Mario Rossi",
    avatar: "MR",
    avatarBorderClassName: "after:border-green-500",
  },
  {
    id: "op-2",
    label: "Luigi Verdi",
    avatar: "LV",
    avatarBorderClassName: "after:border-blue-500",
  },
];

function Harness({
  onSave,
  variant,
}: {
  onSave: (patch: Partial<FormValues>) => void;
  variant: "gate1" | "gate2";
}) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      referente_idoneita_id: "",
      referente_certificazione_id: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      {variant === "gate1" ? (
        <GateReferenteCard options={OPERATOR_OPTIONS} />
      ) : (
        <GateCertificationReferenteCard options={OPERATOR_OPTIONS} />
      )}
      <SimulateFieldChange
        name="referente_idoneita_id"
        testId="set-idoneita"
        value="op-1"
      />
      <SimulateFieldChange
        name="referente_certificazione_id"
        testId="set-certificazione"
        value="op-2"
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

describe("Gate referente cards — Field roll-out", () => {
  it("GateReferenteCard autosave persiste referente_idoneita_id", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} variant="gate1" />);

    fireEvent.click(screen.getByTestId("set-idoneita"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ referente_idoneita_id: "op-1" });
    });
  });

  it("GateCertificationReferenteCard autosave persiste referente_certificazione_id", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} variant="gate2" />);

    fireEvent.click(screen.getByTestId("set-certificazione"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        referente_certificazione_id: "op-2",
      });
    });
  });
});
