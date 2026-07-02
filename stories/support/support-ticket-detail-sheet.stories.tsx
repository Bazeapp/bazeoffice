import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  SupportTicketDetailSheet,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketBoardCardData,
} from "@/modules/support";

const longTitle =
  "Non abbiamo trovato un rapporto lavorativo attivo, devi cercarlo manualmente e collegarlo. Per farlo: 1) Apri la card del ticket, 2) leggi l'allegato ricevuto dal cliente, 3) individua il rapporto corretto, 4) collega manualmente il rapporto e poi procedi con la lavorazione.";

const longTitleCard: SupportTicketBoardCardData = {
  id: "ticket-long-title",
  stage: SUPPORT_TICKET_STATUSES[0].id,
  record: {
    id: "ticket-long-title",
    allegati: [],
    assunzione_id: null,
    causale: longTitle,
    cedolino_id: null,
    chiusura_id: null,
    contributi_id: null,
    created_by: null,
    data_apertura: "2026-05-16T09:30:00.000Z",
    pagamenti_id: null,
    presenze_id: null,
    rapporto_id: null,
    stato: SUPPORT_TICKET_STATUSES[0].id,
    tipo: "Customer",
    urgenza: "media",
    variazione_id: null,
    airtable_id: null,
    airtable_record_id: null,
    creato_il: "2026-05-16T09:30:00.000Z",
    aggiornato_il: "2026-05-16T09:30:00.000Z",
    metadati_migrazione: {
      tag: "Caso particolare",
      note: null,
      assegnatario: "Ivana",
    },
  },
  rapporto: null,
  linkedRecords: [],
  tipo: "Customer",
  causale: longTitle,
  nomeFamiglia: "Famiglia non disponibile",
  nomeLavoratore: "Lavoratore non disponibile",
  nomeCompleto: "Famiglia non disponibile - Lavoratore non disponibile",
  dataAperturaLabel: "16/05/2026",
  tag: "Caso particolare",
  urgenza: "media",
  assegnatario: "Ivana",
  note: null,
  attachmentCount: 0,
};

const meta = {
  title: "Support/SupportTicketDetailSheet",
  component: SupportTicketDetailSheet,
  args: {
    open: true,
    card: null,
    stages: SUPPORT_TICKET_STATUSES,
    onOpenChange: () => undefined,
    onMoveTicket: async () => undefined,
    onPatchTicket: async () => undefined,
  },
  argTypes: {
    open: { control: "boolean" },
    card: { control: "object" },
  },
} satisfies Meta<typeof SupportTicketDetailSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const LongTitleHeaderWrap: Story = {
  args: {
    card: longTitleCard,
    rapportoOptions: [],
  },
};
