"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Label — three documented variants:
 *   field (default) — sentence-case 12px form label.
 *   eyebrow         — 10px uppercase section header.
 *   meta            — 11px uppercase muted, for inline metadata.
 *
 * Pass `required` to render the red asterisk and set aria-required on the field.
 */
const labelVariants = cva("inline-flex items-center gap-1.5 text-[var(--foreground)]", {
  variants: {
    variant: {
      field: "text-[var(--text-xs)] font-medium",
      eyebrow:
        "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-faint)]",
      meta: "text-[var(--text-2xs)] font-semibold uppercase tracking-[0.06em] text-[var(--foreground-subtle)]",
    },
  },
  defaultVariants: { variant: "field" },
});

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
  optional?: boolean;
}

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, required, optional, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  >
    {children}
    {required ? <span className="text-[var(--danger)]">*</span> : null}
    {optional ? (
      <span className="font-normal text-[var(--foreground-faint)]">opzionale</span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
