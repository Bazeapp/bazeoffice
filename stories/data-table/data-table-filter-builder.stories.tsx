import type { Meta, StoryObj } from "@storybook/react-vite";

import { DataTableFilterBuilder } from "@/components/data-table/data-table-filter-builder";
import { createEmptyGroup } from "@/components/data-table/data-table-filters";

const meta = {
  title: "DataTable/DataTableFilterBuilder",
  component: DataTableFilterBuilder,
  args: {
    fields: [
      { label: "Nome", value: "nome", type: "text" },
      {
        label: "Stato",
        value: "stato",
        type: "enum",
        options: [
          { label: "Attivo", value: "attivo" },
          { label: "Archiviato", value: "archiviato" },
        ],
      },
      { label: "Creato il", value: "creato_il", type: "date" },
    ],
    group: createEmptyGroup(),
    onChange: () => undefined,
    isRoot: true,
  },
  argTypes: {
    fields: { control: "object" },
    group: { control: "object" },
    isRoot: { control: "boolean" },
  },
} satisfies Meta<typeof DataTableFilterBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

