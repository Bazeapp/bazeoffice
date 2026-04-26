"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — refresh primitive.
 *
 * Variants
 *   default          Filled accent (primary CTA). Inset-top highlight.
 *   secondary        Filled neutral.
 *   outline          1px ring, transparent fill.
 *   ghost            Hover-only background.
 *   link             Inline accent link, underline on hover.
 *   destructive      Soft red — for inline destructive actions.
 *   destructive-strong  Filled red — reserved for AlertDialog confirm.
 *
 * Sizes
 *   xs / sm / md(default) / lg
 *   icon-sm / icon / icon-lg   square
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-[var(--radius-lg)] font-medium leading-none",
    "transition-[background,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "outline-none focus-visible:shadow-[var(--shadow-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--neutral-950)] !text-white",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-[var(--neutral-800)]",
        ],
        secondary: [
          "bg-[var(--neutral-150)] !text-[var(--foreground-strong)]",
          "hover:bg-[var(--neutral-200)]",
        ],
        outline: [
          "bg-[var(--surface)] !text-[var(--foreground-strong)]",
          "shadow-[inset_0_0_0_1px_var(--border-strong)]",
          "hover:bg-[var(--neutral-100)]",
        ],
        ghost: [
          "bg-transparent !text-[var(--foreground-strong)]",
          "hover:bg-[var(--neutral-150)]",
        ],
        link: [
          "bg-transparent !text-[var(--accent)] px-0 h-auto",
          "hover:!text-[var(--accent-hover)]",
        ],
        destructive: [
          "bg-[var(--danger-soft)] !text-[var(--danger)]",
          "shadow-[inset_0_0_0_1px_var(--danger)]",
          "hover:bg-[var(--danger-muted)]",
        ],
        "destructive-strong": [
          "bg-[var(--red-500)] !text-white",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-[var(--red-700)]",
        ],
      },
      size: {
        xs: "h-6 px-2.5 text-[var(--text-2xs)]",
        sm: "h-7 px-3 text-[var(--text-xs)]",
        default: "h-9 px-4 text-[var(--text-sm)]",
        lg: "h-11 px-6 text-[var(--text-md)]",
        "icon-sm": "h-7 w-7",
        icon: "h-9 w-9",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
