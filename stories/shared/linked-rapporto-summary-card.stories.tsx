import type { Meta, StoryObj } from "@storybook/react-vite";

import { LinkedRapportoSummaryCard } from "@/components/shared/linked-rapporto-summary-card";
import type { RapportoLavorativoRecord } from "@/types";

const rapporto = {
  id: "rapporto-story-1",
  id_rapporto: "RAP-001",
  nome_lavoratore_per_url: "Noelia Alfaro",
  stato_servizio: "Attivo",
  stato_rapporto: "Attivo",
  tipo_rapporto: "Part time",
  ore_a_settimana: 20,
  data_inizio_rapporto: "2026-04-24",
} as RapportoLavorativoRecord;

const meta = {
  title: "Shared/LinkedRapportoSummaryCard",
  component: LinkedRapportoSummaryCard,
  argTypes: {
    title: { control: "text" },
    rapporto: { control: "object" },
    level: { control: "text" },
    status: { control: "text" },
    type: { control: "text" },
    hoursPerWeek: { control: "text" },
    startDate: { control: "text" },
  },
  args: {
    title: "Rapporto lavorativo",
    rapporto,
    level: "Livello B",
    status: "Attivo",
    type: "Part time",
    hoursPerWeek: "20",
    startDate: "2026-04-24",
  },
} satisfies Meta<typeof LinkedRapportoSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <LinkedRapportoSummaryCard {...args} />
    </div>
  ),
};
