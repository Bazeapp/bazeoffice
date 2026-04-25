"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "ui-next z-50 w-[280px] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)]",
      "shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]",
      "outline-none",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
HoverCardContent.displayName = "HoverCardContent";

const HoverCardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-start gap-2.5 p-3.5", className)} {...props} />
);

const HoverCardTags = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-wrap gap-1.5 px-3.5 pb-2.5", className)} {...props} />
);

const HoverCardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between px-3.5 py-2.5",
      "border-t border-[var(--border-subtle)] bg-[var(--background-subtle)]",
      className
    )}
    {...props}
  />
);

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardHeader,
  HoverCardTags,
  HoverCardFooter,
};
