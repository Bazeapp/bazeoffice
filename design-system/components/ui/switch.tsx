"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const switchVariants = cva(
  [
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
    "transition-[background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "outline-none focus-visible:shadow-[var(--shadow-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--neutral-300)]",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-7 p-0.5",
        md: "h-5 w-9 p-0.5",
        lg: "h-6 w-11 p-0.5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const thumbVariants = cva(
  [
    "pointer-events-none block rounded-full bg-white shadow-sm",
    "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]",
  ],
  {
    variants: {
      size: {
        sm: "size-3 data-[state=checked]:translate-x-3",
        md: "size-4 data-[state=checked]:translate-x-4",
        lg: "size-5 data-[state=checked]:translate-x-5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(switchVariants({ size }), className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className={thumbVariants({ size })} />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
