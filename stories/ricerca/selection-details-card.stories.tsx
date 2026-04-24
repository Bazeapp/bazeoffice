import type { Meta, StoryObj } from "@storybook/react-vite";

import { SelectionDetailsCard } from "@/components/ricerca/selection-details-card";
import { lookupColorsByDomain } from "../mocks";

const statusOptions = [
  { label: "Da colloquiare", value: "Da colloquiare" },
  { label: "Non risponde", value: "Non risponde" },
  { label: "No match", value: "No match" },
];

const meta = {
  title: "Ricerca/SelectionDetailsCard",
  component: SelectionDetailsCard,
  args: {
    selectionRow: {
      stato_selezione: "Da colloquiare",
      note_selezione: "Profilo interessante per esperienza e disponibilità.",
      motivo_inserimento_manuale: "Inserita dal recruiter dopo colloquio.",
      followup_senza_risposta: "",
      motivo_archivio: "",
      motivo_non_selezionato: [],
      motivo_no_match: "",
    },
    lookupColorsByDomain,
    statusOptions,
    followupOptions: [
      { label: "Primo followup", value: "Primo followup" },
      { label: "Secondo followup", value: "Secondo followup" },
    ],
    archivioOptions: [{ label: "Non disponibile", value: "Non disponibile" }],
    nonSelezionatoOptions: [{ label: "Poor fit", value: "Poor fit" }],
    noMatchOptions: [{ label: "Budget", value: "Budget" }],
    disabled: false,
    onPatchField: () => undefined,
  },
  argTypes: {
    disabled: { control: "boolean" },
    selectionRow: { control: "object" },
  },
} satisfies Meta<typeof SelectionDetailsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

