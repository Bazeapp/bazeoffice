import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatoLeadCard } from "@/components/crm/cards/stato-lead-card";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "Ricerca/StatoLeadCard",
  component: StatoLeadCard,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    title: "Stato lead",
    showStageField: true,
    onChangeStage: () => undefined,
    onPatchProcess: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
    title: { control: "text" },
    showStageField: { control: "boolean" },
  },
} satisfies Meta<typeof StatoLeadCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

