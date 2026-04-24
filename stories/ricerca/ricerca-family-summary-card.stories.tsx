import type { Meta, StoryObj } from "@storybook/react-vite";

import { RicercaFamilySummaryCard } from "@/components/ricerca/ricerca-family-summary-card";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "Ricerca/RicercaFamilySummaryCard",
  component: RicercaFamilySummaryCard,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    onPatchProcess: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
  },
} satisfies Meta<typeof RicercaFamilySummaryCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

