import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecruiterFeedbackSheet } from "@/components/lavoratori/recruiter-feedback-sheet";

const meta = {
  title: "Lavoratori/RecruiterFeedbackSheet",
  component: RecruiterFeedbackSheet,
  args: {
    open: true,
    entries: [
      {
        name: "Francesca",
        date: "09/04/2026",
        text: "Si presenta bene, disponibile per lavori part time su Milano.",
      },
      {
        name: "Elisa",
        date: "11/04/2026",
        text: "Preferisce famiglie con orari stabili.",
      },
    ],
    onOpenChange: () => undefined,
  },
  argTypes: {
    open: { control: "boolean" },
    entries: { control: "object" },
  },
} satisfies Meta<typeof RecruiterFeedbackSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

