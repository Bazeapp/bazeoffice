import type { Meta, StoryObj } from "@storybook/react-vite";

import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";

const editDays = [
  { field: "mon", label: "Lun" },
  { field: "tue", label: "Mar" },
  { field: "wed", label: "Mer" },
  { field: "thu", label: "Gio" },
  { field: "fri", label: "Ven" },
];

const editBands = [
  { field: "morning", label: "Mattina" },
  { field: "afternoon", label: "Pomeriggio" },
  { field: "evening", label: "Sera" },
];

const meta = {
  title: "Lavoratori/Blocchi/AvailabilityCalendarCard",
  component: AvailabilityCalendarCard,
  args: {
    titleMeta: "20 ore / settimana",
    isEditing: false,
    showEditAction: true,
    collapsible: true,
    defaultOpen: true,
    isUpdating: false,
    editDays,
    editBands,
    hourLabels: ["Mattina", "Pomeriggio", "Sera"],
    readOnlyRows: [
      { day: "Lunedì", activeByHour: [true, true, false] },
      { day: "Martedì", activeByHour: [true, false, false] },
      { day: "Mercoledì", activeByHour: [true, true, false] },
      { day: "Giovedì", activeByHour: [true, true, false] },
      { day: "Venerdì", activeByHour: [true, false, false] },
    ],
    comparisonRows: [{ day: "Lunedì", activeByHour: [true, false, false] }],
    familyRequestsText: "Richiesta famiglia: mattina dal lunedì al venerdì.",
    matrix: {
      "mon:morning": true,
      "mon:afternoon": true,
      "tue:morning": true,
    },
    vincoliOrari: "Preferisce lavorare entro le 15:00.",
    onToggleEdit: () => undefined,
    onMatrixChange: () => undefined,
    onVincoliChange: () => undefined,
    onVincoliBlur: () => undefined,
  },
  argTypes: {
    isEditing: { control: "boolean" },
    showEditAction: { control: "boolean" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    isUpdating: { control: "boolean" },
    titleMeta: { control: "text" },
    familyRequestsText: { control: "text" },
    vincoliOrari: { control: "text" },
  },
} satisfies Meta<typeof AvailabilityCalendarCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
