import type { Meta, StoryObj } from "@storybook/react-vite";

import { SkillsChoiceMatrix } from "@/components/lavoratori/skills-choice-matrix";
import { lookupColorsByDomain } from "../mocks";

const options = [
  { label: "Consigliata", value: "Consigliata" },
  { label: "Sconsigliata", value: "Sconsigliata" },
];

const meta = {
  title: "Lavoratori/SkillsChoiceMatrix",
  component: SkillsChoiceMatrix,
  args: {
    title: "Compatibilità",
    isEditing: false,
    isUpdating: false,
    rows: [
      {
        field: "compatibilita_famiglie_numerose",
        label: "Famiglie numerose",
        domain: "lavoratori.compatibilita_famiglie_numerose",
        value: "Consigliata",
        options,
      },
      {
        field: "compatibilita_famiglie_molto_esigenti",
        label: "Famiglie molto esigenti",
        domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
        value: "Sconsigliata",
        options,
      },
    ],
    lookupColorsByDomain,
    onFieldChange: () => undefined,
  },
  argTypes: {
    title: { control: "text" },
    isEditing: { control: "boolean" },
    isUpdating: { control: "boolean" },
  },
} satisfies Meta<typeof SkillsChoiceMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

