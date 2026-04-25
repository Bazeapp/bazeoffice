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
      disable: true,
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex min-h-screen w-full items-center justify-center bg-transparent p-6 text-foreground">
          <div className="w-fit max-w-full">
            <Story />
          </div>
          <Toaster richColors closeButton position="top-right" />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default preview;
