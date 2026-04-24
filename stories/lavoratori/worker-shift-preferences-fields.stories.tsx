import type { Meta, StoryObj } from "@storybook/react-vite";

import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields";
import { lookupColorsByDomain, lookupOptions } from "../mocks";

const meta = {
  title: "Lavoratori/WorkerShiftPreferencesFields",
  component: WorkerShiftPreferencesFields,
  argTypes: {
    fields: { control: "object" },
    isEditing: { control: "boolean" },
    isUpdating: { control: "boolean" },
    columns: { options: [1, 2], control: { type: "radio" } },
  },
  args: {
    fields: [
      {
        id: "tipo_lavoro_domestico",
        label: "Tipo lavoro",
        value: ["Colf", "Tata"],
        options: lookupOptions.lavori,
        placeholder: "Seleziona lavori",
        onChange: () => undefined,
      },
    ],
    isEditing: false,
    isUpdating: false,
    lookupColorsByDomain,
    columns: 1,
  },
} satisfies Meta<typeof WorkerShiftPreferencesFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
