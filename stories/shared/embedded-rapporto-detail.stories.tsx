import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmbeddedRapportoDetail } from "@/components/shared/embedded-rapporto-detail";
import type { RapportoLavorativoRecord } from "@/types";

const rapporto = {
  id: "rapporto-story-1",
  id_rapporto: "RAP-001",
  nome_lavoratore_per_url: "Noelia Alfaro",
  stato_servizio: "Attivo",
  stato_rapporto: "Attivo",
  tipo_rapporto: "Part time",
  tipo_contratto: "Indeterminato",
  ore_a_settimana: 20,
  data_inizio_rapporto: "2026-04-24",
  paga_oraria_lorda: 10.5,
  paga_mensile_lorda: 900,
  distribuzione_ore_settimana: "lun-ven 9-13",
  webcolf: true,
} as RapportoLavorativoRecord;

const meta = {
  title: "Shared/EmbeddedRapportoDetail",
  component: EmbeddedRapportoDetail,
  argTypes: {
    rapporto: { control: "object" },
  },
  args: {
    rapporto,
  },
} satisfies Meta<typeof EmbeddedRapportoDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[760px]">
      <EmbeddedRapportoDetail {...args} />
    </div>
  ),
};
