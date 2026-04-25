import type { Meta, StoryObj } from "@storybook/react-vite";

import { FamigliaProcessoDetailShell } from "@/components/crm/famiglia-processo-detail-shell";
import { mockCrmCard, mockCrmLookupOptions } from "../mocks";

const meta = {
  title: "Ricerca/FamigliaProcessoDetailShell",
  component: FamigliaProcessoDetailShell,
  args: {
    mode: "inline",
    open: true,
    card: mockCrmCard,
    lookupOptionsByField: mockCrmLookupOptions,
    editMode: "toggle",
    showTempistiche: true,
    showAnnuncio: true,
    showHeaderMeta: true,
    showPrimaryControls: true,
    showContextCard: true,
    showOrariFrequenza: true,
    showLuogoLavoro: true,
    showFamiglia: true,
    showCasa: true,
    showAnimali: true,
    showMansioni: true,
    showRichiesteSpecifiche: true,
    showBlockEditActions: true,
    blocksCollapsible: true,
    firstBlockDefaultOpen: true,
    blocksDefaultOpen: false,
    isActive: true,
    readOnly: false,
    onOpenChange: () => undefined,
    onChangeStatoSales: () => undefined,
    onPatchProcess: () => undefined,
    onPatchFamily: () => undefined,
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["inline", "sheet"] },
    open: { control: "boolean" },
    card: { control: "object" },
    editMode: { control: "inline-radio", options: ["always", "toggle"] },
    showTempistiche: { control: "boolean" },
    showAnnuncio: { control: "boolean" },
    showHeaderMeta: { control: "boolean" },
    showPrimaryControls: { control: "boolean" },
    showContextCard: { control: "boolean" },
    showOrariFrequenza: { control: "boolean" },
    showLuogoLavoro: { control: "boolean" },
    showFamiglia: { control: "boolean" },
    showCasa: { control: "boolean" },
    showAnimali: { control: "boolean" },
    showMansioni: { control: "boolean" },
    showRichiesteSpecifiche: { control: "boolean" },
    showBlockEditActions: { control: "boolean" },
    blocksCollapsible: { control: "boolean" },
    firstBlockDefaultOpen: { control: "boolean" },
    blocksDefaultOpen: { control: "boolean" },
    isActive: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
} satisfies Meta<typeof FamigliaProcessoDetailShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
