import type { Meta, StoryObj } from "@storybook/react-vite";

import { SupportTicketDetailSheet } from "@/components/support/support-ticket-detail-sheet";
import { SUPPORT_TICKET_STATUSES } from "@/components/support/support-ticket-config";

const meta = {
  title: "Support/SupportTicketDetailSheet",
  component: SupportTicketDetailSheet,
  args: {
    open: true,
    card: null,
    stages: SUPPORT_TICKET_STATUSES,
    onOpenChange: () => undefined,
    onMoveTicket: async () => undefined,
    onPatchTicket: async () => undefined,
  },
  argTypes: {
    open: { control: "boolean" },
    card: { control: "object" },
  },
} satisfies Meta<typeof SupportTicketDetailSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

