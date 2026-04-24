import type { Meta, StoryObj } from "@storybook/react-vite";

import { JobSearchCard } from "@/components/lavoratori/job-search-card";
import { lookupColorsByDomain, lookupOptions } from "../mocks";

const draft = {
  tipo_lavoro_domestico: ["Colf", "Tata"],
  tipo_rapporto_lavorativo: ["Part time"],
  check_lavori_accettabili: ["Lavori di 3 giorni", "Lavori di 5 giorni"],
  check_accetta_lavori_con_trasferta: "Accetta",
  check_accetta_multipli_contratti: "Accetta",
  check_accetta_paga_9_euro_netti: "Accetta",
};

const meta = {
  title: "Lavoratori/JobSearchCard",
  component: JobSearchCard,
  args: {
    isEditing: false,
    showEditAction: true,
    isUpdating: false,
    draft,
    tipoLavoroOptions: lookupOptions.lavori,
    tipoRapportoOptions: lookupOptions.rapporti,
    lavoriAccettabiliOptions: lookupOptions.giorni,
    trasfertaOptions: lookupOptions.yesNo,
    multipliContrattiOptions: lookupOptions.yesNo,
    paga9Options: lookupOptions.yesNo,
    lookupColorsByDomain,
    selectedTipoLavoro: draft.tipo_lavoro_domestico,
    selectedTipoRapporto: draft.tipo_rapporto_lavorativo,
    selectedLavoriAccettabili: draft.check_lavori_accettabili,
    selectedTrasferta: draft.check_accetta_lavori_con_trasferta,
    selectedMultipliContratti: draft.check_accetta_multipli_contratti,
    selectedPaga9: draft.check_accetta_paga_9_euro_netti,
    onToggleEdit: () => undefined,
    onTipoLavoroChange: () => undefined,
    onTipoRapportoChange: () => undefined,
    onLavoriAccettabiliChange: () => undefined,
    onTrasfertaChange: () => undefined,
    onMultipliContrattiChange: () => undefined,
    onPaga9Change: () => undefined,
  },
  argTypes: {
    isEditing: { control: "boolean" },
    showEditAction: { control: "boolean" },
    isUpdating: { control: "boolean" },
  },
} satisfies Meta<typeof JobSearchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

