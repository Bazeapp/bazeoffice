import type { Meta, StoryObj } from "@storybook/react-vite";

import { AvailabilityStatusCard } from "@/components/lavoratori/availability-status-card";
import { lookupOptions } from "../mocks";

const meta = {
  title: "Lavoratori/AvailabilityStatusCard",
  component: AvailabilityStatusCard,
  argTypes: {
    isEditing: { control: "boolean" },
    showEditAction: { control: "boolean" },
    isUpdating: { control: "boolean" },
    draft: { control: "object" },
    selectedDisponibilita: { control: "text" },
    selectedDataRitorno: { control: "text" },
    onToggleEdit: { action: "toggle edit" },
    onDisponibilitaChange: { action: "availability changed" },
    onDataRitornoChange: { action: "return date changed" },
    onDataRitornoBlur: { action: "return date blurred" },
  },
  args: {
    isEditing: true,
    showEditAction: true,
    isUpdating: false,
    disponibilitaOptions: lookupOptions.availability,
    draft: { disponibilita: "Disponibile", data_ritorno_disponibilita: "" },
    selectedDisponibilita: "Disponibile",
    selectedDisponibilitaBadgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-700",
    selectedDataRitorno: "",
  },
} satisfies Meta<typeof AvailabilityStatusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <AvailabilityStatusCard {...args} />
    </div>
  ),
};
