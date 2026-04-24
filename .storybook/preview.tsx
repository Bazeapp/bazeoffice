import type { Preview } from "@storybook/react-vite";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
      sort: "requiredFirst",
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    layout: "centered",
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(0 0% 98%)" },
        { name: "white", value: "hsl(0 0% 100%)" },
        { name: "muted", value: "hsl(210 20% 96%)" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="min-h-screen bg-muted p-6 text-foreground">
          <Story />
          <Toaster richColors closeButton position="top-right" />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default preview;
