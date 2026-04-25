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
        "ui-next z-50 max-w-[240px] rounded-[6px] px-[9px] py-[5px]",
        "bg-[#0c0c0c] !text-white",
        "text-[11px] leading-[1.35] font-medium",
        "shadow-[var(--shadow-md)]",
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
              "inline-flex h-[15px] min-w-[15px] items-center justify-center px-1",
              "rounded-[3px] bg-white/15 text-[10px] font-semibold !text-white/90",
              "font-[var(--font-mono)]"
            )}
          >
            {shortcut}
          </kbd>
        ) : null}
      </span>
      <TooltipPrimitive.Arrow
        width={9}
        height={5}
        className="fill-[#0c0c0c]"
      />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
