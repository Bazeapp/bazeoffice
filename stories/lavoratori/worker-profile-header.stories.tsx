import type { Meta, StoryObj } from "@storybook/react-vite";

import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { lookupOptions, mockWorker, mockWorkerRow } from "../mocks";

const meta = {
  title: "Lavoratori/WorkerProfileHeader",
  component: WorkerProfileHeader,
  args: {
    worker: mockWorker,
    workerRow: mockWorkerRow,
    headerLayout: "stacked",
    statoLavoratoreOptions: [
      { label: "Idoneo", value: "Idoneo" },
      { label: "Non idoneo", value: "Non idoneo" },
    ],
    disponibilitaOptions: lookupOptions.availability,
    sessoOptions: [
      { label: "Donna", value: "Donna" },
      { label: "Uomo", value: "Uomo" },
    ],
    nazionalitaOptions: [
      { label: "Peru", value: "Peru" },
      { label: "Italia", value: "Italia" },
    ],
    motivazioniOptions: [
      { label: "Non disponibile", value: "Non disponibile" },
      { label: "Altro", value: "Altro" },
    ],
    fieldsDisabled: false,
    blacklistChecked: false,
    presentationPhotoSlots: ["/worker_placeholder_1.png", "/worker_placeholder_2.png"],
    selectedPresentationPhotoIndex: 0,
    showAiImageEditAction: true,
    showUploadPhotoAction: true,
    onPatchField: () => undefined,
    onStatoLavoratoreChange: () => undefined,
    onDisponibilitaChange: () => undefined,
    onDataRitornoDisponibilitaChange: () => undefined,
    onMotivazioneChange: () => undefined,
    onBlacklistToggle: () => undefined,
    onSelectedPresentationPhotoIndexChange: () => undefined,
    onAiImageEdit: () => undefined,
    onUploadPhoto: () => undefined,
  },
  argTypes: {
    headerLayout: { control: "inline-radio", options: ["side", "stacked"] },
    fieldsDisabled: { control: "boolean" },
    blacklistChecked: { control: "boolean" },
    showAiImageEditAction: { control: "boolean" },
    showUploadPhotoAction: { control: "boolean" },
    selectedPresentationPhotoIndex: { control: { type: "number", min: 0, max: 1 } },
  },
} satisfies Meta<typeof WorkerProfileHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

