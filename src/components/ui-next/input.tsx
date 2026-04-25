"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * Input — refresh primitive. Single source of truth.
 * Use `<Field>` for label/help/error wiring.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      data-invalid={invalid || undefined}
      className={cn(
        "h-[var(--h-md)] w-full rounded-[var(--radius-md)] bg-[var(--surface)]",
        "px-3 text-[var(--text-sm)] text-[var(--foreground-strong)]",
        "shadow-[inset_0_0_0_1px_var(--border)]",
        "placeholder:text-[var(--foreground-faint)]",
        "transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
        "disabled:bg-[var(--neutral-100)] disabled:text-[var(--foreground-faint)] disabled:cursor-not-allowed",
        "data-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
