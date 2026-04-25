import type { Meta, StoryObj } from "@storybook/react-vite";

import { CreazioneAnnuncioCard } from "@/components/crm/cards/creazione-annuncio-card";

const meta = {
  title: "Ricerca/CreazioneAnnuncioCard",
  component: CreazioneAnnuncioCard,
  argTypes: {
    title: { control: "text" },
    brief: { control: "text" },
    briefOnly: { control: "boolean" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    processId: { control: "text" },
    containerProps: { table: { disable: true } },
    titleAction: { table: { disable: true } },
  },
  args: {
    title: "Creazione Annuncio",
    brief: "Brief annuncio per lavoro colf part-time.",
    briefOnly: true,
    collapsible: true,
    defaultOpen: true,
    processId: "process-story-1",
  },
} satisfies Meta<typeof CreazioneAnnuncioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <CreazioneAnnuncioCard {...args} />
    </div>
  ),
};
