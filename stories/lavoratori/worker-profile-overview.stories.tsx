import type { Meta, StoryObj } from "@storybook/react-vite";

import { WorkerProfileOverview } from "@/components/lavoratori/worker-profile-overview";
import { mockWorker, mockWorkerRow } from "../mocks";

const meta = {
  title: "Lavoratori/Blocchi/WorkerProfileOverview",
  component: WorkerProfileOverview,
  argTypes: {
    worker: { control: "object" },
    workerRow: { control: "object" },
    isEditing: { control: "boolean" },
    draft: { control: "object" },
    presentationPhotoSlots: { control: "object" },
    selectedPresentationPhotoIndex: { control: { type: "number", min: 0, max: 2 } },
    showUploadPhotoAction: { control: "boolean" },
    uploadingPhoto: { control: "boolean" },
    onSelectedPresentationPhotoIndexChange: { action: "photo selected" },
    onUploadPhoto: { action: "upload photo" },
    onFieldChange: { action: "field changed" },
    onFieldBlur: { action: "field blurred" },
  },
  args: {
    worker: mockWorker,
    workerRow: mockWorkerRow,
    isEditing: false,
    draft: {
      nome: "Noelia",
      cognome: "Alfaro",
      email: "noelia.alfaro@example.com",
      telefono: "+39 333 123 4567",
      sesso: "Donna",
      nazionalita: "Peru",
      data_di_nascita: "1978-04-24",
      descrizione_pubblica: "Persona affidabile e precisa.",
    },
    livelloItaliano: "Alto",
    livelloItalianoOptions: [{ label: "Alto", value: "Alto" }],
    sessoOptions: [{ label: "Donna", value: "Donna" }],
    nazionalitaOptions: [{ label: "Peru", value: "Peru" }],
    presentationPhotoSlots: ["/worker_placeholder_1.png", "/worker_placeholder_2.png"],
    selectedPresentationPhotoIndex: 0,
    showUploadPhotoAction: true,
    uploadingPhoto: false,
  },
} satisfies Meta<typeof WorkerProfileOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[760px] rounded-xl border bg-background p-4">
      <WorkerProfileOverview {...args} />
    </div>
  ),
};
