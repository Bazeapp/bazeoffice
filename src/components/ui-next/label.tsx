"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Label — three documented variants:
 *   eyebrow (default) — 10px uppercase tracked muted, for form field labels
 *                       and section headers (es. STATO ASSUNZIONE).
 *   field             — sentence-case 14px medium, uso raro: form classici
 *                       senza tono sectionato.
 *   meta              — 11px uppercase muted, per metadata inline.
 *
 * Pass `required` to render the red asterisk and set aria-required on the field.
 */
const labelVariants = cva("inline-flex items-center gap-1.5 text-[var(--foreground)]", {
  variants: {
    variant: {
      field: "text-[var(--text-sm)] font-medium",
      eyebrow:
        "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-faint)]",
      meta: "text-[var(--text-2xs)] font-semibold uppercase tracking-[0.06em] text-[var(--foreground-subtle)]",
    },
  },
  defaultVariants: { variant: "eyebrow" },
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
