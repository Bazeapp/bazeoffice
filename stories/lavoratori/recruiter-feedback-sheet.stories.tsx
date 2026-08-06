import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecruiterFeedbackButton } from "@/modules/lavoratori/components/recruiter-feedback-sheet";

const meta = {
  title: "Lavoratori/RecruiterFeedbackButton",
  component: RecruiterFeedbackButton,
  args: {
    variant: "inline",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["floating", "fab", "inline"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof RecruiterFeedbackButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
