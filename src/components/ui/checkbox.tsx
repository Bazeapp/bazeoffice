"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex size-4 shrink-0 items-center justify-center",
      "rounded-sm bg-surface",
      "shadow-[inset_0_0_0_1px_var(--border-strong)]",
      "transition-[background,box-shadow] duration-(--duration-fast) ease-out",
      "focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
      "data-[state=checked]:bg-accent data-[state=checked]:shadow-[inset_0_0_0_1px_var(--accent)]",
      "data-[state=indeterminate]:bg-accent data-[state=indeterminate]:shadow-[inset_0_0_0_1px_var(--accent)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="text-foreground-on-accent">
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
        <path d="M3.5 8.5l3 3 6-6" />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

/**
 * CheckboxChip — variante "pill" della checkbox.
 *
 *   active=true  → chip pieno con accent-soft bg + accent-ink text + check icon
 *   active=false → chip outline grigio
 *
 * Mantiene la semantica di una checkbox (multi-select indipendente). Per
 * single-select usa RadioGroup, non questo.
 */
export const CheckboxChip = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    children: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium",
      "border border-border-strong bg-surface text-foreground-muted",
      "transition-colors duration-(--duration-fast) ease-out",
      "outline-none focus-visible:shadow-(--shadow-ring)",
      "hover:bg-neutral-50 hover:text-foreground-strong",
      "data-[state=checked]:bg-accent-soft data-[state=checked]:border-accent",
      "data-[state=checked]:text-accent-ink data-[state=checked]:font-semibold",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M3.5 8.5l3 3 6-6" />
      </svg>
    </CheckboxPrimitive.Indicator>
    <span>{children}</span>
  </CheckboxPrimitive.Root>
));
CheckboxChip.displayName = "CheckboxChip";
