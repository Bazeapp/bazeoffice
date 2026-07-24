/**
 * FieldMultiSelect must bridge lookup value_key (UI items) ↔ value_label (DB).
 * Without that, chips can show labels while list checkboxes stay unchecked,
 * and toggling re-adds the same option as a key (duplicates / flicker).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { Form } from "@/components/ui/form";
import { FieldMultiSelect } from "../field-components";

const OPTIONS = [
  { value: "lavori_1_giorno", label: "Lavori di 1 giorno" },
  { value: "lavori_2_giorni", label: "Lavori di 2 giorni" },
  { value: "lavori_3_giorni", label: "Lavori di 3 giorni" },
];

function Harness({ defaults }: { defaults: string[] }) {
  const form = useForm<{ check_lavori_accettabili: string[] }>({
    defaultValues: { check_lavori_accettabili: defaults },
  });

  const values = useWatch({
    control: form.control,
    name: "check_lavori_accettabili",
  });

  return (
    <Form {...form}>
      <FieldMultiSelect
        name="check_lavori_accettabili"
        options={OPTIONS}
        placeholder="Seleziona lavori"
      />
      <pre data-testid="form-values">{JSON.stringify(values ?? [])}</pre>
    </Form>
  );
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByRole("combobox");
  await user.click(input);
  await waitFor(() => {
    expect(input).toHaveAttribute("aria-expanded", "true");
  });
  return screen.getByRole("listbox");
}

describe("FieldMultiSelect — lookup key/label bridge", () => {
  it("marks a DB label as selected when option value_key differs", async () => {
    const user = userEvent.setup();
    render(<Harness defaults={["Lavori di 1 giorno"]} />);

    const listbox = await openList(user);
    const selected = within(listbox).getByRole("option", {
      name: "Lavori di 1 giorno",
    });
    expect(selected).toHaveAttribute("aria-selected", "true");
  });

  it("toggling a selected DB label removes it instead of appending the value_key", async () => {
    const user = userEvent.setup();
    render(<Harness defaults={["Lavori di 1 giorno"]} />);

    const listbox = await openList(user);
    await user.click(
      within(listbox).getByRole("option", { name: "Lavori di 1 giorno" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("form-values")).toHaveTextContent("[]");
    });
  });

  it("persists value_label (not value_key) when selecting a new option", async () => {
    const user = userEvent.setup();
    render(<Harness defaults={["Lavori di 1 giorno"]} />);

    const listbox = await openList(user);
    await user.click(
      within(listbox).getByRole("option", { name: "Lavori di 2 giorni" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("form-values")).toHaveTextContent(
        JSON.stringify(["Lavori di 1 giorno", "Lavori di 2 giorni"]),
      );
    });
  });

});
