/**
 * U5/U6 — GateShiftPreferencesCard Field roll-out (autosave via gateFieldsForm).
 */
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateShiftPreferencesCard } from "../gate-checks-cards";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

type FormValues = {
  tipo_rapporto_lavorativo: string[];
  check_lavori_accettabili: string[];
  disponibilita_nel_giorno: string[];
};

const TIPO_RAPPORTO_OPTIONS = [
  { value: "fisso", label: "Fisso" },
  { value: "sostituzione", label: "Sostituzione" },
];

const LAVORI_OPTIONS = [
  { value: "pulizie", label: "Pulizie" },
  { value: "stiro", label: "Stiro" },
];

const DISPONIBILITA_OPTIONS = [
  { value: "mattina", label: "Mattina" },
  { value: "pomeriggio", label: "Pomeriggio" },
];

function Harness({
  onSave,
  isPaused,
  isEditing = true,
}: {
  onSave: (patch: Partial<FormValues>) => Promise<void> | void;
  isPaused?: () => boolean;
  isEditing?: boolean;
}) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      tipo_rapporto_lavorativo: [],
      check_lavori_accettabili: [],
      disponibilita_nel_giorno: [],
    },
    onSave,
    isPaused,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateShiftPreferencesCard
        isEditing={isEditing}
        lookupColorsByDomain={new Map()}
        tipoRapportoOptions={TIPO_RAPPORTO_OPTIONS}
        lavoriAccettabiliOptions={LAVORI_OPTIONS}
        disponibilitaNelGiornoOptions={DISPONIBILITA_OPTIONS}
      />
      <SimulateFieldChange name="disponibilita_nel_giorno" testId="set-disponibilita-mattina" value={["mattina"]} />
      <SimulateFieldChange name="tipo_rapporto_lavorativo" testId="set-tipo-fisso" value={["fisso"]} />
      <SimulateFieldChange name="check_lavori_accettabili" testId="set-lavori-pulizie" value={["pulizie"]} />
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
  value: string[];
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

describe("GateShiftPreferencesCard — Field roll-out", () => {
  it("autosave persiste disponibilita_nel_giorno quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-disponibilita-mattina"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ disponibilita_nel_giorno: ["mattina"] });
    });
  });

  it("autosave persiste tipo_rapporto_lavorativo quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-tipo-fisso"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ tipo_rapporto_lavorativo: ["fisso"] });
    });
  });

  it("autosave persiste check_lavori_accettabili quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-lavori-pulizie"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ check_lavori_accettabili: ["pulizie"] });
    });
  });

  it("non salva mentre isPaused è attivo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let paused = true;
    render(<Harness onSave={onSave} isPaused={() => paused} />);

    fireEvent.click(screen.getByTestId("set-disponibilita-mattina"));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      paused = false;
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ disponibilita_nel_giorno: ["mattina"] });
    });
  });

  it("mostra toast.error quando onSave rigetta", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("patch rifiutata"));
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-disponibilita-mattina"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("patch rifiutata");
    });
  });

  it("in sola lettura mostra '-' quando non ci sono valori selezionati", () => {
    render(<Harness onSave={vi.fn()} isEditing={false} />);

    expect(screen.getAllByText("-").length).toBe(3);
  });
});
