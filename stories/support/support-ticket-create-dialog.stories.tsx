import type { Meta, StoryObj } from "@storybook/react-vite";

import { SupportTicketCreateDialog } from "@/components/support/support-ticket-create-dialog";

const meta = {
  title: "Support/SupportTicketCreateDialog",
  component: SupportTicketCreateDialog,
  args: {
    open: true,
    defaultTicketType: "Customer",
    rapportoOptions: [
      { id: "rapporto-1", label: "Famiglia Giannobi - Noelia Alfaro" },
      { id: "rapporto-2", label: "Famiglia Manganotti - Alba" },
    ],
    onOpenChange: () => undefined,
    onCreateTicket: async () => undefined,
  },
  argTypes: {
    open: { control: "boolean" },
    defaultTicketType: { control: "inline-radio", options: ["Customer", "Payroll"] },
  },
} satisfies Meta<typeof SupportTicketCreateDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

