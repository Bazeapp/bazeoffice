"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

/**
 * InputGroup — refresh primitive.
 *
 * Use cases:
 *   <InputGroup>
 *     <InputGroup.Prefix>€</InputGroup.Prefix>
 *     <InputGroup.Input value="9,80" />
 *     <InputGroup.Suffix>€/ora</InputGroup.Suffix>
 *   </InputGroup>
 *
 *   <InputGroup variant="joined">
 *     <InputGroup.Input value="40" />
 *     <InputGroup.Addon>ore / settimana</InputGroup.Addon>
 *   </InputGroup>
 */

interface RootProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "inset" | "joined";
}

function Root({ className, variant = "inset", children, ...props }: RootProps) {
  if (variant === "joined") {
    return (
      <div
        className={cn(
          "flex items-stretch rounded-md",
          "shadow-[inset_0_0_0_1px_var(--border)]",
          "focus-within:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
          "[&>input]:border-0 [&>input]:shadow-none [&>input]:rounded-none [&>input]:focus:shadow-none",
          "*:first:rounded-l-md *:last:rounded-r-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}

function Prefix({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "absolute left-2.5 top-1/2 -translate-y-1/2 z-10",
        "text-sm font-medium text-foreground-subtle pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

function Suffix({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "absolute right-2.5 top-1/2 -translate-y-1/2",
        "text-[10px] uppercase tracking-[0.04em] text-foreground-faint pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

function Addon({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 bg-background-subtle",
        "border-l border-border text-xs text-foreground-muted",
        className
      )}
      {...props}
    />
  );
}

interface InsetInputProps extends InputProps {
  insetLeft?: boolean;
  insetRight?: boolean;
}

function GroupInput({ className, insetLeft, insetRight, ...props }: InsetInputProps) {
  return (
    <Input
      className={cn(insetLeft && "pl-7", insetRight && "pr-16", className)}
      {...props}
    />
  );
}

interface StepperProps {
  value: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

function Stepper({ value, onChange, min = 0, max = 999, step = 1, className }: StepperProps) {
  const dec = () => onChange?.(Math.max(min, value - step));
  const inc = () => onChange?.(Math.min(max, value + step));
  return (
    <div
      className={cn(
        "inline-flex items-stretch rounded-md overflow-hidden",
        "shadow-[0_0_0_1px_var(--border)] focus-within:shadow-[0_0_0_1px_var(--accent),var(--shadow-ring)]",
        className
      )}
    >
      <button
        type="button"
        onClick={dec}
        className="bg-background-subtle border-r border-border px-3 text-md font-semibold text-foreground-muted hover:bg-surface-muted"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange?.(n);
        }}
        className="w-12 text-center text-sm outline-none tabular-nums bg-surface"
      />
      <button
        type="button"
        onClick={inc}
        className="bg-background-subtle border-l border-border px-3 text-md font-semibold text-foreground-muted hover:bg-surface-muted"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export const InputGroup = Object.assign(Root, {
  Prefix,
  Suffix,
  Addon,
  Input: GroupInput,
  Stepper,
});
