/**
 * U6 — GatePresentationCard Field roll-out (autosave via gateFieldsForm).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useController } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Form } from "@/components/ui/form";
import type { LavoratoreListItem } from "../../../components/lavoratore-card";
import type { LavoratoreRecord } from "../../../types/lavoratore";
import { GatePresentationCard } from "../gate-presentation-card";

type FormValues = {
  nome: string;
  cognome: string;
  descrizione_pubblica: string;
  livello_italiano: string;
  sesso: string;
  nazionalita: string;
};

const mockWorker: LavoratoreListItem = {
  id: "worker-1",
  nomeCompleto: "Mario Rossi",
  immagineUrl: null,
  statoQualificazione: "qualificato",
};

const mockWorkerRow = {
  id: "worker-1",
  nome: "Mario",
  cognome: "Rossi",
  email: "mario@example.com",
  telefono: "+39 333 000 0000",
  sesso: "",
  nazionalita: "",
  data_di_nascita: "1990-01-01",
  descrizione_pubblica: "",
  livello_italiano: "",
} as LavoratoreRecord;

function Harness({ onSave }: { onSave: (patch: Partial<FormValues>) => void }) {
  const form = useAutoSaveForm<FormValues>({
    defaults: {
      nome: "",
      cognome: "",
      descrizione_pubblica: "",
      livello_italiano: "",
      sesso: "",
      nazionalita: "",
    },
    onSave,
    debounceMs: 10,
  });

  return (
    <Form {...form}>
      <GatePresentationCard
        worker={mockWorker}
        workerRow={mockWorkerRow}
        sessoOptions={[{ label: "Uomo", value: "uomo" }]}
        nazionalitaOptions={[{ label: "Italia", value: "italia" }]}
        livelloItalianoOptions={[{ label: "Alto", value: "alto" }]}
        lookupColorsByDomain={new Map()}
        presentationPhotoSlots={[]}
        selectedPresentationPhotoIndex={0}
        isEditing
        onSelectedPresentationPhotoIndexChange={() => undefined}
      />
      <SimulateFieldChange name="nome" testId="set-nome" value="Luigi" />
      <SimulateFieldChange
        name="descrizione_pubblica"
        testId="set-descrizione"
        value="Profilo aggiornato"
      />
      <SimulateFieldChange name="sesso" testId="set-sesso" value="uomo" />
      <SimulateFieldChange
        name="nazionalita"
        testId="set-nazionalita"
        value="italia"
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

describe("GatePresentationCard — Field roll-out", () => {
  it("autosave persiste nome quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-nome"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ nome: "Luigi" });
    });
  });

  it("autosave persiste descrizione_pubblica quando il valore cambia", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-descrizione"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        descrizione_pubblica: "Profilo aggiornato",
      });
    });
  });

  it("autosave persiste sesso e nazionalita quando i valori cambiano", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByTestId("set-sesso"));
    fireEvent.click(screen.getByTestId("set-nazionalita"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        sesso: "uomo",
        nazionalita: "italia",
      });
    });
  });
});
