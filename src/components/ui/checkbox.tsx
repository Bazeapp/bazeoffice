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
