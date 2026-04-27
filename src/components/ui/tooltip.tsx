"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  shortcut?: React.ReactNode;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, children, shortcut, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "ui z-50 max-w-60 rounded-sm px-2.25 py-1.25",
        "bg-neutral-950 text-foreground-on-accent!",
        "text-2xs leading-[1.35] font-medium",
        "shadow-(--shadow-md)",
        "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        <span>{children}</span>
        {shortcut ? (
          <kbd
            className={cn(
              "inline-flex h-3.75 min-w-3.75 items-center justify-center px-1",
              "rounded-[3px] bg-surface/15 text-[10px] font-semibold text-foreground-on-accent/90!",
              "font-(--font-mono)"
            )}
          >
            {shortcut}
          </kbd>
        ) : null}
      </span>
      <TooltipPrimitive.Arrow
        width={9}
        height={5}
        className="fill-neutral-950"
      />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
