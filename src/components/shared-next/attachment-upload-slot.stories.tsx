import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot";

const meta = {
  title: "Shared Next/Attachment Upload Slot",
  component: AttachmentUploadSlot,
  decorators: [
    (Story) => (
      <div className="ui w-120">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: "text" },
    isUploading: { control: "boolean" },
  },
  args: {
    label: "Carta d'identità",
    value: null,
    isUploading: false,
    onAdd: fn(),
    onPreviewOpen: fn(),
  },
} satisfies Meta<typeof AttachmentUploadSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithImage: Story = {
  args: {
    label: "Foto profilo",
    value: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format.jpg",
  },
};

export const WithPdf: Story = {
  args: {
    label: "Permesso di soggiorno",
    value: "https://www.example.com/permesso-soggiorno.pdf",
  },
};

export const Uploading: Story = {
  args: {
    label: "Codice fiscale",
    isUploading: true,
  },
};

export const LongLabel: Story = {
  args: {
    label: "Certificato di idoneità sanitaria per lavoro domestico",
    value: "https://www.example.com/certificato.pdf",
  },
};

export const StackedList: Story = {
  decorators: [
    (Story) => (
      <div className="ui w-120">
        <div className="flex flex-col gap-2">
          <Story />
        </div>
      </div>
    ),
  ],
  render: () => (
    <>
      <AttachmentUploadSlot
        label="Carta d'identità"
        value="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format.jpg"
        isUploading={false}
        onAdd={fn()}
        onPreviewOpen={fn()}
      />
      <AttachmentUploadSlot
        label="Codice fiscale"
        value={null}
        isUploading={false}
        onAdd={fn()}
        onPreviewOpen={fn()}
      />
      <AttachmentUploadSlot
        label="Permesso di soggiorno"
        value="https://www.example.com/permesso.pdf"
        isUploading={false}
        onAdd={fn()}
        onPreviewOpen={fn()}
      />
      <AttachmentUploadSlot
        label="Contratto firmato"
        value={null}
        isUploading={true}
        onAdd={fn()}
        onPreviewOpen={fn()}
      />
    </>
  ),
};
