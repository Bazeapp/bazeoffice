import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingContextCard } from "@/components/crm/cards/onboarding-context-card";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "CRM/OnboardingContextCard",
  component: OnboardingContextCard,
  args: {
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    onPatchProcess: () => undefined,
    onPatchFamily: () => undefined,
  },
  argTypes: {
    card: { control: "object" },
  },
} satisfies Meta<typeof OnboardingContextCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

