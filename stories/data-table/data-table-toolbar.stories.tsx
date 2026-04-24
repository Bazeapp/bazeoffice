import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { createEmptyGroup } from "@/components/data-table/data-table-filters";

type Row = {
  nome: string;
  stato: string;
};

const columns: ColumnDef<Row>[] = [
  { accessorKey: "nome", header: "Nome" },
  { accessorKey: "stato", header: "Stato" },
];

const data: Row[] = [
  { nome: "Noelia Alfaro", stato: "Idoneo" },
  { nome: "Alba Manganotti", stato: "Lead" },
];

const meta = {
  title: "DataTable/DataTableToolbar",
  component: DataTableToolbar<Row>,
  args: {
    searchValue: "",
    filters: createEmptyGroup(),
    filterFields: [
      { label: "Nome", value: "nome", type: "text" },
      { label: "Stato", value: "stato", type: "text" },
    ],
    searchPlaceholder: "Cerca",
    savedViews: [
      { id: "view-1", name: "Attivi", updatedAt: "2026-04-24" },
      { id: "view-2", name: "Da verificare", updatedAt: "2026-04-24" },
    ],
    activeViewId: "view-1",
    enableGrouping: true,
    compactControls: false,
    hasPendingFilters: false,
    onSearchValueChange: () => undefined,
    onFiltersChange: () => undefined,
    onSaveCurrentView: () => undefined,
    onApplySavedView: () => undefined,
    onDeleteSavedView: () => undefined,
    onApplyFilters: () => undefined,
  },
  argTypes: {
    searchValue: { control: "text" },
    searchPlaceholder: { control: "text" },
    enableGrouping: { control: "boolean" },
    compactControls: { control: "boolean" },
    hasPendingFilters: { control: "boolean" },
  },
  render: (args) => {
    const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
    return <DataTableToolbar {...args} table={table} />;
  },
} satisfies Meta<typeof DataTableToolbar<Row>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

