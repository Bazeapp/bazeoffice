import type { Meta, StoryObj } from "@storybook/react-vite";

import { FamigliaProcessoDetailContent } from "@/components/crm/famiglia-processo-detail-content";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "CRM/FamigliaProcessoDetailContent",
  component: FamigliaProcessoDetailContent,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    editMode: "toggle",
    showTempistiche: true,
    showAnnuncio: true,
    showHeaderMeta: true,
    showPrimaryControls: true,
    showContextCard: true,
    isActive: true,
    readOnly: false,
    onChangeStatoSales: () => undefined,
    onPatchProcess: () => undefined,
    onPatchFamily: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
    editMode: { control: "inline-radio", options: ["always", "toggle"] },
    showTempistiche: { control: "boolean" },
    showAnnuncio: { control: "boolean" },
    showHeaderMeta: { control: "boolean" },
    showPrimaryControls: { control: "boolean" },
    showContextCard: { control: "boolean" },
    isActive: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
} satisfies Meta<typeof FamigliaProcessoDetailContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

