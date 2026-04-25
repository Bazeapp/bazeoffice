"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";

/**
 * Accordion — refresh primitive.
 *   default — card-bound, accent-on-active title, optional count.
 *   flush   — borderless rows, for full-bleed embeds.
 */
const Accordion = AccordionPrimitive.Root;

const itemVariants = cva("", {
  variants: {
    tone: {
      default: "border-b border-[var(--border-subtle)] last:border-b-0",
      flush: "border-b border-[var(--border-subtle)] last:border-b-0",
    },
  },
  defaultVariants: { tone: "default" },
});

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> &
    VariantProps<typeof itemVariants>
>(({ className, tone, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(itemVariants({ tone }), className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  count?: React.ReactNode;
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, count, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex flex-1 items-center justify-between gap-2 px-3.5 py-3",
        "text-[var(--text-sm)] font-normal text-[var(--foreground)]",
        "data-[state=open]:font-medium data-[state=open]:text-[var(--foreground-strong)]",
        "outline-none focus-visible:shadow-[var(--shadow-ring)]",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2 truncate">
        {children}
        {count != null ? (
          <Badge variant="secondary" shape="square" size="sm">
            {count}
          </Badge>
        ) : null}
      </span>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-3.5 shrink-0 text-[var(--foreground-subtle)] transition-transform group-data-[state=open]:rotate-180 group-data-[state=open]:text-[var(--accent)]"
        aria-hidden
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-[var(--text-xs)] leading-relaxed text-[var(--foreground-muted)]",
      "data-[state=open]:bg-[var(--neutral-50)]",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  >
    <div className="px-3.5 pb-3.5 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
