/**
 * U6 — GateSpecificChecksCard Field roll-out (autosave via gateFieldsForm).
 */
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import { GateSpecificChecksCard } from "../gate-checks-cards";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

type FormValues = {
  come_ti_sposti: string[];
  check_accetta_babysitting_neonati: string;
  check_accetta_babysitting_multipli_bambini: string;
  check_accetta_case_con_cani: string;
  check_accetta_case_con_cani_grandi: string;
  check_accetta_case_con_gatti: string;
  check_accetta_salire_scale_o_soffitti_alti: string;
  check_accetta_lavori_con_trasferta: string;
};

const ACCEPT_OPTIONS = [
  { value: "accetta", label: "Accetta" },
  { value: "non_accetta", label: "Non accetta" },
];

const MOBILITY_OPTIONS = [
  { value: "mezzi", label: "Mezzi pubblici" },
  { value: "auto", label: "Automunito" },
];

function Harness({
  onSave,
  isPaused,
  showMobility = false,
  isBabysitterEnabled = true,
}: {
  onSave: (patch: Partial<FormValues>) => Promise<void> | void;
  isPaused?: () => boolean;
  showMobility?: boolean;
  isBabysitterEnabled?: boolean;
}) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      come_ti_sposti: [],
      check_accetta_babysitting_neonati: "",
      check_accetta_babysitting_multipli_bambini: "",
      check_accetta_case_con_cani: "",
      check_accetta_case_con_cani_grandi: "",
      check_accetta_case_con_gatti: "",
      check_accetta_salire_scale_o_soffitti_alti: "",
      check_accetta_lavori_con_trasferta: "",
    },
    onSave,
    isPaused,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GateSpecificChecksCard
        showMobility={showMobility}
        mobilityOptions={MOBILITY_OPTIONS}
        isBabysitterEnabled={isBabysitterEnabled}
        lookupColorsByDomain={new Map()}
        babysittingNeonatiOptions={ACCEPT_OPTIONS}
        babysittingMultipliBambiniOptions={ACCEPT_OPTIONS}
        caseConCaniOptions={ACCEPT_OPTIONS}
        caseConCaniGrandiOptions={ACCEPT_OPTIONS}
        caseConGattiOptions={ACCEPT_OPTIONS}
        scaleSoffittiOptions={ACCEPT_OPTIONS}
        trasfertaOptions={ACCEPT_OPTIONS}
      />
      <SimulateFieldChange
        name="come_ti_sposti"
        testId="set-mobility"
        value={["mezzi"]}
      />
      <SimulateFieldChange
        name="check_accetta_babysitting_neonati"
        testId="set-neonati"
        value="Accetta"
      />
      <SimulateFieldChange
        name="check_accetta_case_con_cani"
        testId="set-cani"
        value="Non accetta"
      />
      <SimulateFieldChange
        name="check_accetta_lavori_con_trasferta"
        testId="set-trasferta"
        value="Accetta"
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
  value: string | string[];
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

describe("GateSpecificChecksCard — Field roll-out", () => {
  it("autosave persiste check_accetta_babysitting_neonati quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-neonati"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_babysitting_neonati: "Accetta",
      });
    });
  });

  it("autosave persiste check_accetta_case_con_cani quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-cani"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_case_con_cani: "Non accetta",
      });
    });
  });

  it("autosave persiste check_accetta_lavori_con_trasferta quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-trasferta"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_lavori_con_trasferta: "Accetta",
      });
    });
  });

  it("autosave persiste come_ti_sposti quando showMobility è attivo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} showMobility />);

    fireEvent.click(screen.getByTestId("set-mobility"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ come_ti_sposti: ["mezzi"] });
    });
  });

  it("non salva mentre isPaused è attivo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let paused = true;
    render(<Harness onSave={onSave} isPaused={() => paused} />);

    fireEvent.click(screen.getByTestId("set-neonati"));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      paused = false;
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        check_accetta_babysitting_neonati: "Accetta",
      });
    });
  });

  it("mostra toast.error quando onSave rigetta", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("patch rifiutata"));
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-neonati"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("patch rifiutata");
    });
  });
});
