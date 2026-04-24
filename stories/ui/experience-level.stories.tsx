import type { Meta, StoryObj } from "@storybook/react-vite";

import { ExperienceLevel } from "@/components/ui/experience-level";

const meta = {
  title: "UI/ExperienceLevel",
  component: ExperienceLevel,
  argTypes: {
    label: { control: "text" },
    years: { control: "text" },
  },
  args: {
    label: "Colf",
    years: "7",
  },
} satisfies Meta<typeof ExperienceLevel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
