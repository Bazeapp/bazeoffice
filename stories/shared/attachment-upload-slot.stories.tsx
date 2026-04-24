import type { Meta, StoryObj } from "@storybook/react-vite";

import { AttachmentUploadSlot } from "@/components/shared/attachment-upload-slot";

const meta = {
  title: "Shared/AttachmentUploadSlot",
  component: AttachmentUploadSlot,
  argTypes: {
    label: { control: "text" },
    value: { control: "object" },
    isUploading: { control: "boolean" },
    onAdd: { action: "file added" },
    onPreviewOpen: { action: "preview opened" },
  },
  args: {
    label: "Documento identità",
    value: [{ name: "documento.pdf", url: "https://example.com/documento.pdf" }],
    isUploading: false,
  },
} satisfies Meta<typeof AttachmentUploadSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[420px]">
      <AttachmentUploadSlot {...args} />
    </div>
  ),
};
