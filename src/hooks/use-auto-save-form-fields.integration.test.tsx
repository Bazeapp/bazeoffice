/**
 * FASE 5 BIS.0 — tests per `useAutoSaveFormFields`.
 *
 * Il hook è il cuore del Form Field Context: aggancia react-hook-form
 * all'autosave così è strutturalmente impossibile "dimenticare il save".
 *
 * Scenari coperti:
 *   1. un cambio campo utente → onSave con la patch del solo campo cambiato
 *   2. dirty-tracking: rimettere il valore committato non rilancia onSave
 *   3. onSave che rigetta → toast.error (FASE 4 TER)
 *   4. isPaused() true → il save è rimandato finché non si sblocca
 *   5. più campi cambiati nella stessa finestra → un'unica patch (coalescing)
 */
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveFormFields } from "@/hooks/use-auto-save-form-fields";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

type FormValues = { nome: string; email: string };

function Harness({
  onSave,
  isPaused,
}: {
  onSave: (patch: Partial<FormValues>) => Promise<void> | void;
  isPaused?: () => boolean;
}) {
  const form = useForm<FormValues>({
    defaultValues: { nome: "iniziale", email: "a@a.it" },
  });
  useAutoSaveFormFields({ form, onSave, isPaused, debounceMs: 10 });
  return (
    <form>
      <input aria-label="nome" {...form.register("nome")} />
      <input aria-label="email" {...form.register("email")} />
    </form>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAutoSaveFormFields", () => {
  it("salva solo il campo cambiato con la patch corretta", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("nome"), {
      target: { value: "Mario" },
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ nome: "Mario" });
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("dirty-tracking: rimettere il valore iniziale non salva", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    const input = screen.getByLabelText("nome");
    fireEvent.change(input, { target: { value: "iniziale" } });

    // diamo tempo al debounce di scattare
    await new Promise((r) => setTimeout(r, 40));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("toast.error quando onSave rigetta", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("server giù"));
    render(<Harness onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("nome"), {
      target: { value: "Luigi" },
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("server giù");
    });
  });

  it("isPaused=true rimanda il save finché non si sblocca", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let paused = true;
    render(<Harness onSave={onSave} isPaused={() => paused} />);

    fireEvent.change(screen.getByLabelText("nome"), {
      target: { value: "Anna" },
    });

    // in pausa: nessun salvataggio
    await new Promise((r) => setTimeout(r, 60));
    expect(onSave).not.toHaveBeenCalled();

    // sblocco → salva
    act(() => {
      paused = false;
    });
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ nome: "Anna" });
    });
  });

  it("accorpa più campi nella stessa finestra in un'unica patch", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("nome"), {
      target: { value: "Carla" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "c@c.it" },
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave).toHaveBeenCalledWith({ nome: "Carla", email: "c@c.it" });
  });
});
