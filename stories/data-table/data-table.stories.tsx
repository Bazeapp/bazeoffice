import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";

type Row = {
  nome: string;
  stato: string;
  provincia: string;
};

const columns: ColumnDef<Row>[] = [
  { accessorKey: "nome", header: "Nome" },
  { accessorKey: "stato", header: "Stato" },
  { accessorKey: "provincia", header: "Provincia" },
];

const meta = {
  title: "DataTable/DataTable",
  component: DataTable<Row, unknown>,
  args: {
    columns,
    data: [
      { nome: "Noelia Alfaro", stato: "Idoneo", provincia: "Milano" },
      { nome: "Lorenza Giannobi", stato: "Lead", provincia: "Milano" },
    ],
    filterFields: [
      { label: "Nome", value: "nome", type: "text" },
      {
        label: "Stato",
        value: "stato",
        type: "enum",
        options: [
          { label: "Idoneo", value: "Idoneo" },
          { label: "Lead", value: "Lead" },
        ],
      },
    ],
    searchPlaceholder: "Cerca",
    pageSize: 10,
    stickyHeader: true,
  },
  argTypes: {
    data: { control: "object" },
    pageSize: { control: { type: "number", min: 1, max: 50 } },
    stickyHeader: { control: "boolean" },
  },
} satisfies Meta<typeof DataTable<Row, unknown>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

