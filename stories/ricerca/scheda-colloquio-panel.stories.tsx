import type { Meta, StoryObj } from "@storybook/react-vite";

import { SchedaColloquioPanel } from "@/components/ricerca/scheda-colloquio-panel";
import { lookupColorsByDomain } from "../mocks";

const meta = {
  title: "Ricerca/SchedaColloquioPanel",
  component: SchedaColloquioPanel,
  args: {
    selectionRow: {
      stato_selezione: "Da colloquiare",
      vanno_bene_i_giorni: "Sì",
      vanno_bene_gli_orari: "Sì",
      distanza_con_altri_impegni: "Compatibile",
      accetta_stipendio: "Sì",
      pro_motivazioni: "Esperienza coerente con la famiglia.",
      aspetti_divergenza: "Da verificare distanza.",
      score_distanza_orari: "Alto",
      score_esperienze: "Alto",
      score_paga_9_euro: "Medio",
      score_overall: "Alto",
      feedback_baze: "Feedback finale da inviare alla famiglia.",
    },
    statusOptions: [
      { label: "Da colloquiare", value: "Da colloquiare" },
      { label: "No Match", value: "No Match" },
      { label: "Match", value: "Match" },
    ],
    nonSelezionatoOptions: [{ label: "Poor fit", value: "Poor fit" }],
    noMatchOptions: [{ label: "Budget", value: "Budget" }],
    lookupColorsByDomain,
    disabled: false,
    isGeneratingFeedback: false,
    onGenerateFeedback: () => "Feedback generato",
    onMoveStatus: () => undefined,
    onPatchField: () => undefined,
  },
  argTypes: {
    selectionRow: { control: "object" },
    disabled: { control: "boolean" },
    isGeneratingFeedback: { control: "boolean" },
  },
} satisfies Meta<typeof SchedaColloquioPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

