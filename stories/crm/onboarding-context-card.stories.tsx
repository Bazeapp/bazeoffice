import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingContextCard } from "@/components/crm/cards/onboarding-context-card";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "Ricerca/OnboardingContextCard",
  component: OnboardingContextCard,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    collapsible: true,
    defaultOpen: true,
    onPatchProcess: () => undefined,
    onPatchFamily: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
  },
} satisfies Meta<typeof OnboardingContextCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
