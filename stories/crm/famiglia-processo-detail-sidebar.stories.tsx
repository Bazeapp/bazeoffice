import type { Meta, StoryObj } from "@storybook/react-vite";

import { FamigliaProcessoDetailSidebar } from "@/components/crm/famiglia-processo-detail-sidebar";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "CRM/FamigliaProcessoDetailSidebar",
  component: FamigliaProcessoDetailSidebar,
  args: {
    open: true,
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    editMode: "toggle",
    onOpenChange: () => undefined,
    onChangeStatoSales: () => undefined,
    onPatchProcess: () => undefined,
    onPatchFamily: () => undefined,
  },
  argTypes: {
    open: { control: "boolean" },
    card: { control: "object" },
    editMode: { control: "inline-radio", options: ["always", "toggle"] },
  },
} satisfies Meta<typeof FamigliaProcessoDetailSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

