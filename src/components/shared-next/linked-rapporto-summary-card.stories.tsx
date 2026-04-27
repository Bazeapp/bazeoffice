import type { Meta, StoryObj } from "@storybook/react-vite";

import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card";
import type { RapportoLavorativoRecord } from "@/types";

const baseRapporto: RapportoLavorativoRecord = {
  id: "rap-001",
  nome_lavoratore_per_url: "Aria Bocelli",
  stato_rapporto: "Attivo",
  stato_servizio: "Attivo",
  tipo_rapporto: "Tempo determinato",
  ore_a_settimana: 40,
  data_inizio_rapporto: "2025-09-01",
} as RapportoLavorativoRecord;

const meta = {
  title: "Shared Next/Linked Rapporto Summary Card",
  component: LinkedRapportoSummaryCard,
  decorators: [
    (Story) => (
      <div className="ui w-205">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: "text" },
    level: { control: "text" },
    status: { control: "text" },
    type: { control: "text" },
    hoursPerWeek: { control: "text" },
    startDate: { control: "text" },
  },
  args: {
    title: "Famiglia Rossi · Babysitter weekend",
    rapporto: baseRapporto,
    level: "Senior",
    status: "Attivo",
    type: "Tempo determinato",
    hoursPerWeek: 40,
    startDate: "2025-09-01",
  },
} satisfies Meta<typeof LinkedRapportoSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
