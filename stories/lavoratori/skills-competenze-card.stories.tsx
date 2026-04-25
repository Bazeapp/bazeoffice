import type { Meta, StoryObj } from "@storybook/react-vite";

import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import { lookupColorsByDomain } from "../mocks";

const skillValues = {
  livello_pulizie: "Alto",
  check_accetta_salire_scale_o_soffitti_alti: "Accetta",
  compatibilita_famiglie_numerose: "Consigliata",
  compatibilita_famiglie_molto_esigenti: "Sconsigliata",
  compatibilita_lavoro_con_datore_presente_in_casa: "Consigliata",
  compatibilita_con_case_di_grandi_dimensioni: "Consigliata",
  compatibilita_con_elevata_autonomia_richiesta: "Consigliata",
  compatibilita_con_contesti_pacati: "Consigliata",
  livello_stiro: "Medio",
  compatibilita_con_stiro_esigente: "Sconsigliata",
  livello_cucina: "Alto",
  compatibilita_con_cucina_strutturata: "Consigliata",
  livello_babysitting: "Medio",
  check_accetta_babysitting_multipli_bambini: "Accetta",
  check_accetta_babysitting_neonati: "Accetta",
  compatibilita_babysitting_neonati: "Consigliata",
  livello_dogsitting: "Medio",
  check_accetta_case_con_cani: "Accetta",
  check_accetta_case_con_cani_grandi: "Non accetta",
  check_accetta_case_con_gatti: "Accetta",
  compatibilita_con_animali_in_casa: "Consigliata",
  livello_giardinaggio: "Basso",
  livello_italiano: "Alto",
  livello_inglese: "Basso",
};

const levelOptions = [
  { label: "Basso", value: "Basso" },
  { label: "Medio", value: "Medio" },
  { label: "Alto", value: "Alto" },
];

const choiceOptions = [
  { label: "Accetta", value: "Accetta" },
  { label: "Non accetta", value: "Non accetta" },
  { label: "Consigliata", value: "Consigliata" },
  { label: "Sconsigliata", value: "Sconsigliata" },
];

const lookupOptionsByDomain = new Map<string, typeof levelOptions>([
  ["lavoratori.livello_pulizie", levelOptions],
  ["lavoratori.livello_stiro", levelOptions],
  ["lavoratori.livello_cucina", levelOptions],
  ["lavoratori.livello_babysitting", levelOptions],
  ["lavoratori.livello_dogsitting", levelOptions],
  ["lavoratori.livello_giardinaggio", levelOptions],
  ["lavoratori.livello_italiano", levelOptions],
  ["lavoratori.livello_inglese", levelOptions],
]);

for (const key of Object.keys(skillValues)) {
  if (!key.startsWith("livello_")) {
    lookupOptionsByDomain.set(`lavoratori.${key}`, choiceOptions);
  }
}

const meta = {
  title: "Lavoratori/Blocchi/SkillsCompetenzeCard",
  component: SkillsCompetenzeCard,
  args: {
    isEditing: false,
    showEditAction: true,
    collapsible: true,
    defaultOpen: true,
    isUpdating: false,
    draft: skillValues,
    selectedValues: skillValues,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    onToggleEdit: () => undefined,
    onFieldChange: () => undefined,
  },
  argTypes: {
    isEditing: { control: "boolean" },
    showEditAction: { control: "boolean" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    isUpdating: { control: "boolean" },
  },
} satisfies Meta<typeof SkillsCompetenzeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
