import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

const meta = {
  title: "UI/Combobox",
  component: Combobox,
  argTypes: {
    defaultValue: { control: "text" },
  },
  args: {
    defaultValue: "Milano",
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Combobox {...args} items={["Milano", "Roma", "Torino"]}>
      <ComboboxTrigger className="w-[260px]">
        <ComboboxValue placeholder="Seleziona citta" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Cerca..." />
        <ComboboxList>
          <ComboboxEmpty>Nessun risultato</ComboboxEmpty>
          {["Milano", "Roma", "Torino"].map((item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};
