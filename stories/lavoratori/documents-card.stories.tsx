import type { Meta, StoryObj } from "@storybook/react-vite";

import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { lookupColorsByDomain } from "../mocks";

const draft = {
  stato_verifica_documenti: "Documenti verificati",
  documenti_in_regola: "Ho tutti i documenti in regola",
  data_scadenza_naspi: "2026-12-31",
  iban: "IT60X0542811101000000123456",
  id_stripe_account: "acct_story",
};

const meta = {
  title: "Lavoratori/Blocchi/DocumentsCard",
  component: DocumentsCard,
  args: {
    workerId: "worker-story-1",
    isEditing: false,
    showEditAction: true,
    collapsible: true,
    defaultOpen: true,
    isUpdating: false,
    draft,
    selectedValues: {
      stato_verifica_documenti: draft.stato_verifica_documenti,
      documenti_in_regola: draft.documenti_in_regola,
      data_scadenza_naspi: draft.data_scadenza_naspi,
    },
    documents: [],
    documentsLoading: false,
    verificationOptions: [
      { label: "Documenti verificati", value: "Documenti verificati" },
      { label: "Da verificare", value: "Da verificare" },
    ],
    statoDocumentiOptions: [
      { label: "Ho tutti i documenti in regola", value: "Ho tutti i documenti in regola" },
      { label: "Documenti mancanti", value: "Documenti mancanti" },
    ],
    lookupColorsByDomain,
    administrativeValues: {
      iban: draft.iban,
      id_stripe_account: draft.id_stripe_account,
    },
    onToggleEdit: () => undefined,
    onVerificationChange: () => undefined,
    onStatoDocumentiChange: () => undefined,
    onNaspiChange: () => undefined,
    onNaspiBlur: () => undefined,
    onIbanChange: () => undefined,
    onIbanBlur: () => undefined,
    onStripeAccountChange: () => undefined,
    onStripeAccountBlur: () => undefined,
    onDocumentUpsert: () => undefined,
    onUploadError: () => undefined,
  },
  argTypes: {
    isEditing: { control: "boolean" },
    showEditAction: { control: "boolean" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    isUpdating: { control: "boolean" },
    documentsLoading: { control: "boolean" },
  },
} satisfies Meta<typeof DocumentsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
