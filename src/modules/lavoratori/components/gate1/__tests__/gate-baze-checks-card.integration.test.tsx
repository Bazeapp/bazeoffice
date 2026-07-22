/**
 * U6 — GateBazeChecksCard Field roll-out (autosave via gateFieldsForm).
 */
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateBazeChecksCard } from "../gate-checks-cards";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

type FormValues = {
  check_accetta_funzionamento_baze: string;
  check_accetta_paga_9_euro_netti: string;
  check_accetta_multipli_contratti: string;
  paga_oraria_richiesta: string;
  data_scadenza_naspi_worker: string;
};

const ACCEPT_OPTIONS = [
  { value: "accetta", label: "Accetta" },
  { value: "non_accetta", label: "Non accetta" },
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
      check_accetta_funzionamento_baze: "",
      check_accetta_paga_9_euro_netti: "",
      check_accetta_multipli_contratti: "",
      paga_oraria_richiesta: "",
      data_scadenza_naspi_worker: "",
    },
    onSave,
    isPaused,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateBazeChecksCard
        isEditing={isEditing}
        lookupColorsByDomain={new Map()}
        funzionamentoBazeOptions={ACCEPT_OPTIONS}
        paga9Options={ACCEPT_OPTIONS}
        multipliContrattiOptions={ACCEPT_OPTIONS}
      />
      <SimulateFieldChange
        name="check_accetta_funzionamento_baze"
        testId="set-funzionamento-baze"
        value="Accetta"
      />
      <SimulateFieldChange
        name="check_accetta_paga_9_euro_netti"
        testId="set-paga9"
        value="Non accetta"
      />
      <SimulateFieldChange
        name="check_accetta_multipli_contratti"
        testId="set-multipli"
        value="Accetta"
      />
      <SimulateFieldChange
        name="paga_oraria_richiesta"
        testId="set-paga-oraria"
        value="12"
      />
      <SimulateFieldChange
        name="data_scadenza_naspi_worker"
        testId="set-naspi"
        value="2026-12-31"
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

describe("GateBazeChecksCard — Field roll-out", () => {
  it("autosave persiste check_accetta_funzionamento_baze quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-funzionamento-baze"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_funzionamento_baze: "Accetta",
      });
    });
  });

  it("autosave persiste check_accetta_paga_9_euro_netti quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-paga9"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_paga_9_euro_netti: "Non accetta",
      });
    });
  });

  it("autosave persiste check_accetta_multipli_contratti quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-multipli"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_multipli_contratti: "Accetta",
      });
    });
  });

  it("autosave persiste paga_oraria_richiesta quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-paga-oraria"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ paga_oraria_richiesta: "12" });
    });
  });

  it("autosave persiste data_scadenza_naspi_worker quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-naspi"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        data_scadenza_naspi_worker: "2026-12-31",
      });
    });
  });

  it("non salva mentre isPaused è attivo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let paused = true;
    render(<Harness onSave={onSave} isPaused={() => paused} />);

    fireEvent.click(screen.getByTestId("set-funzionamento-baze"));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      paused = false;
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_funzionamento_baze: "Accetta",
      });
    });
  });

  it("mostra toast.error quando onSave rigetta", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("patch rifiutata"));
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-funzionamento-baze"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("patch rifiutata");
    });
  });

  it("in sola lettura mostra '-' quando i campi sono vuoti", () => {
    render(<Harness onSave={vi.fn()} isEditing={false} />);

    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
  });
});
