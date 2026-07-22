/**
 * U6 — Gate verification cards Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import {
  GateAdministrativeFieldsCard,
  GateDocumentIdentityCard,
  GateSelfCertificationCard,
} from "../gate-verification-cards";

type FormValues = {
  documenti_in_regola: string;
  hai_referenze: string;
  nome: string;
  cognome: string;
  data_di_nascita: string;
  nazionalita: string;
  iban: string;
};

const LOOKUP_OPTIONS = [{ label: "Si", value: "si" }];

function Harness({
  onSave,
  variant,
}: {
  onSave: (patch: Partial<FormValues>) => void;
  variant: "self-cert" | "identity" | "admin";
}) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      documenti_in_regola: "",
      hai_referenze: "",
      nome: "",
      cognome: "",
      data_di_nascita: "",
      nazionalita: "",
      iban: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      {variant === "self-cert" ? (
        <GateSelfCertificationCard
          documentiOptions={LOOKUP_OPTIONS}
          referenzeOptions={LOOKUP_OPTIONS}
        />
      ) : null}
      {variant === "identity" ? (
        <GateDocumentIdentityCard
          nazionalitaOptions={LOOKUP_OPTIONS}
          isEditing
        />
      ) : null}
      {variant === "admin" ? (
        <GateAdministrativeFieldsCard
          stripeAccountValue=""
          isEditing
          isUpdating={false}
        />
      ) : null}
      <SimulateFieldChange
        name="documenti_in_regola"
        testId="set-documenti"
        value="si"
      />
      <SimulateFieldChange name="hai_referenze" testId="set-referenze" value="si" />
      <SimulateFieldChange name="nome" testId="set-nome" value="Luigi" />
      <SimulateFieldChange name="iban" testId="set-iban" value="IT00X" />
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

describe("GateSelfCertificationCard — Field roll-out", () => {
  it("autosave persiste documenti_in_regola e hai_referenze", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} variant="self-cert" />);

    fireEvent.click(screen.getByTestId("set-documenti"));
    fireEvent.click(screen.getByTestId("set-referenze"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        documenti_in_regola: "si",
        hai_referenze: "si",
      });
    });
  });
});

describe("GateDocumentIdentityCard — Field roll-out", () => {
  it("autosave persiste nome quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} variant="identity" />);

    fireEvent.click(screen.getByTestId("set-nome"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ nome: "Luigi" });
    });
  });
});

describe("GateAdministrativeFieldsCard — Field roll-out", () => {
  it("autosave persiste iban quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} variant="admin" />);

    fireEvent.click(screen.getByTestId("set-iban"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ iban: "IT00X" });
    });
  });
});
