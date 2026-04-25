"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const separatorVariants = cva("shrink-0", {
  variants: {
    variant: {
      solid: "bg-[var(--border)]",
      dashed: "bg-transparent border-dashed border-[var(--border-strong)]",
    },
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px self-stretch",
    },
  },
  compoundVariants: [
    { variant: "dashed", orientation: "horizontal", class: "border-t" },
    { variant: "dashed", orientation: "vertical", class: "border-l" },
  ],
  defaultVariants: { variant: "solid", orientation: "horizontal" },
});

interface SeparatorProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>,
      "orientation"
    >,
    VariantProps<typeof separatorVariants> {
  label?: React.ReactNode;
}

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(({ className, variant, orientation = "horizontal", label, ...props }, ref) => {
  if (label && orientation === "horizontal") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <div className={cn(separatorVariants({ variant, orientation }))} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-faint)]">
          {label}
        </span>
        <div className={cn(separatorVariants({ variant, orientation }))} />
      </div>
    );
  }
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      orientation={orientation ?? "horizontal"}
      className={cn(separatorVariants({ variant, orientation }), className)}
      {...props}
    />
  );
});
Separator.displayName = "Separator";
