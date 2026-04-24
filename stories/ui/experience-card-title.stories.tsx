import type { Meta, StoryObj } from "@storybook/react-vite";

import { ExperienceCardTitle } from "@/components/ui/experience-card-title";

const meta = {
  title: "UI/ExperienceCardTitle",
  component: ExperienceCardTitle,
  argTypes: {
    children: { control: "text" },
  },
  args: {
    children: "Famiglia Rossi",
  },
} satisfies Meta<typeof ExperienceCardTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
