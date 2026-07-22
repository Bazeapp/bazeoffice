/**
 * U6 — GateSkillConfirmationsCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateSkillConfirmationsCard } from "../gate-skill-confirmations-card";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

type FormValues = {
  livello_inglese: string;
  compatibilita_con_stiro_esigente: string;
  rating_atteggiamento: string;
};

const LEVEL_OPTIONS = [
  { value: "basso", label: "Basso" },
  { value: "medio", label: "Medio" },
];

const CHOICE_OPTIONS = [
  { value: "consigliata", label: "Consigliata" },
  { value: "sconsigliata", label: "Sconsigliata" },
];

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      livello_inglese: "",
      compatibilita_con_stiro_esigente: "",
      rating_atteggiamento: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateSkillConfirmationsCard
        isEditing
        isUpdating={false}
        lookupColorsByDomain={new Map()}
        livelloItalianoOptions={LEVEL_OPTIONS}
        livelloIngleseOptions={LEVEL_OPTIONS}
        livelloCucinaOptions={LEVEL_OPTIONS}
        livelloStiroOptions={LEVEL_OPTIONS}
        livelloPulizieOptions={LEVEL_OPTIONS}
        livelloBabysittingOptions={LEVEL_OPTIONS}
        livelloDogsittingOptions={LEVEL_OPTIONS}
        livelloGiardinaggioOptions={LEVEL_OPTIONS}
        compatibilitaStiroOptions={CHOICE_OPTIONS}
        compatibilitaCucinaOptions={CHOICE_OPTIONS}
        compatibilitaNeonatiOptions={CHOICE_OPTIONS}
        ratingCorporaturaOptions={LEVEL_OPTIONS}
        compatibilitaFamiglieNumeroseOptions={CHOICE_OPTIONS}
        compatibilitaFamiglieMoltoEsigentiOptions={CHOICE_OPTIONS}
        compatibilitaDatorePresenteOptions={CHOICE_OPTIONS}
        compatibilitaCaseGrandiOptions={CHOICE_OPTIONS}
        compatibilitaAnimaliOptions={CHOICE_OPTIONS}
        compatibilitaAutonomiaOptions={CHOICE_OPTIONS}
        compatibilitaContestiPacatiOptions={CHOICE_OPTIONS}
      />
      <SimulateFieldChange name="livello_inglese" testId="set-inglese" value="Medio" />
      <SimulateFieldChange
        name="compatibilita_con_stiro_esigente"
        testId="set-stiro"
        value="Consigliata"
      />
      <SimulateFieldChange name="rating_atteggiamento" testId="set-rating" value="4" />
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

describe("GateSkillConfirmationsCard — Field roll-out", () => {
  it("autosave persiste livello_inglese quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-inglese"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ livello_inglese: "Medio" });
    });
  });

  it("autosave persiste compatibilita_con_stiro_esigente quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-stiro"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        compatibilita_con_stiro_esigente: "Consigliata",
      });
    });
  });

  it("autosave persiste rating_atteggiamento quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-rating"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ rating_atteggiamento: "4" });
    });
  });
});
