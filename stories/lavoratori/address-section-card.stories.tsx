import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { lookupOptions } from "../mocks";

function AddressSectionCardDemo(args: React.ComponentProps<typeof AddressSectionCard>) {
  const mobilityAnchor = React.useRef<HTMLDivElement | null>(null);
  return <AddressSectionCard {...args} mobilityAnchor={mobilityAnchor} />;
}

const meta = {
  title: "Lavoratori/Blocchi/AddressSectionCard",
  component: AddressSectionCard,
  args: {
    isEditing: false,
    isUpdating: false,
    showEditAction: true,
    showCap: true,
    addressDraft: {
      provincia: "Milano",
      cap: "20141",
      indirizzo_residenza_completo: "Via Roma 10, Milano",
      come_ti_sposti: ["Mi sposto con i mezzi"],
    },
    provinciaOptions: lookupOptions.province,
    mobilityOptions: lookupOptions.mobility,
    selectedProvincia: "Milano",
    selectedCap: "20141",
    selectedAddress: "Via Roma 10, Milano",
    selectedMobility: ["Mi sposto con i mezzi"],
    onToggleEdit: () => undefined,
    onProvinciaChange: () => undefined,
    onCapChange: () => undefined,
    onCapBlur: () => undefined,
    onAddressChange: () => undefined,
    onAddressBlur: () => undefined,
    onMobilityChange: () => undefined,
  },
  argTypes: {
    isEditing: { control: "boolean" },
    isUpdating: { control: "boolean" },
    showEditAction: { control: "boolean" },
    showCap: { control: "boolean" },
  },
  render: (args) => <AddressSectionCardDemo {...args} />,
} satisfies Meta<typeof AddressSectionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
