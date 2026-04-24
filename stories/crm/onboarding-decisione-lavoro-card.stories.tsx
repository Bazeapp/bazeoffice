import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingDecisioneLavoroCard } from "@/components/crm/cards/onboarding-decisione-lavoro-card";

const meta = {
  title: "CRM/OnboardingDecisioneLavoroCard",
  component: OnboardingDecisioneLavoroCard,
  args: {},
} satisfies Meta<typeof OnboardingDecisioneLavoroCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

