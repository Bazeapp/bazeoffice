import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CheckboxChip } from "@/components/ui/checkbox";
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

const meta = {
  title: "UI/CheckboxChip",
  component: CheckboxChip,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CheckboxChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Sì, taglia media o inferiore",
    defaultChecked: false,
  },
};

export const Checked: Story = {
  args: {
    children: "Sì, taglia media o inferiore",
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Opzione non disponibile",
    disabled: true,
  },
};

export const Group: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend variant="label">Ci sono dei cani?</FieldLegend>
      <FieldGroup className="flex-row flex-wrap gap-2">
        <CheckboxChip id="dogs-small" defaultChecked>
          Sì, taglia media o inferiore
        </CheckboxChip>
        <CheckboxChip id="dogs-large">Sì, taglia grande</CheckboxChip>
      </FieldGroup>
    </FieldSet>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Demo() {
      const [trasferte, setTrasferte] = React.useState(true);
      const [ferie, setFerie] = React.useState(false);
      const [patente, setPatente] = React.useState(false);
      return (
        <FieldSet>
          <FieldLegend variant="label">Vincoli operativi</FieldLegend>
          <FieldGroup className="flex-row flex-wrap gap-2">
            <CheckboxChip
              id="ctrl-trasferte"
              checked={trasferte}
              onCheckedChange={(value) => setTrasferte(Boolean(value))}
            >
              Trasferte richieste
            </CheckboxChip>
            <CheckboxChip
              id="ctrl-ferie"
              checked={ferie}
              onCheckedChange={(value) => setFerie(Boolean(value))}
            >
              Ferie con richieste specifiche
            </CheckboxChip>
            <CheckboxChip
              id="ctrl-patente"
              checked={patente}
              onCheckedChange={(value) => setPatente(Boolean(value))}
            >
              Patente richiesta
            </CheckboxChip>
          </FieldGroup>
        </FieldSet>
      );
    }
    return <Demo />;
  },
};
