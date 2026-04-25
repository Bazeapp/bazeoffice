import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingCard } from "@/components/crm/cards/onboarding-card";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "Ricerca/OnboardingCard",
  component: OnboardingCard,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    showTitle: true,
    showTempistiche: true,
    readOnly: false,
    flattenSections: false,
    onPatchProcess: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
    showTitle: { control: "boolean" },
    showTempistiche: { control: "boolean" },
    readOnly: { control: "boolean" },
    flattenSections: { control: "boolean" },
  },
} satisfies Meta<typeof OnboardingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

