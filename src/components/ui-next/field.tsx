"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldContextValue {
  id: string;
  invalid: boolean;
  describedBy?: string;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useField() {
  const ctx = React.useContext(FieldContext);
  return ctx;
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
}

export function Field({
  className,
  invalid = false,
  children,
  ...props
}: FieldProps) {
  const id = React.useId();
  const helpId = `${id}-help`;
  return (
    <FieldContext.Provider value={{ id, invalid, describedBy: helpId }}>
      <div className={cn("flex flex-col gap-1.5", className)} {...props}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export interface FieldLabelProps extends React.ComponentProps<typeof Label> {}

export function FieldLabel({ children, htmlFor, ...props }: FieldLabelProps) {
  const ctx = useField();
  return (
    <Label htmlFor={htmlFor ?? ctx?.id} {...props}>
      {children}
    </Label>
  );
}

export function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useField();
  if (ctx?.invalid) return null;
  return (
    <p
      id={ctx?.describedBy}
      className={cn("text-[var(--text-2xs)] text-[var(--foreground-subtle)]", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useField();
  if (!ctx?.invalid) return null;
  return (
    <p
      id={ctx.describedBy}
      role="alert"
      className={cn("text-[var(--text-2xs)] text-[var(--danger)]", className)}
      {...props}
    />
  );
}

/**
 * Slot wrapper that injects ctx.id and aria-describedby into the contained input.
 * Use when you want explicit control over the input element.
 */
export function FieldControl({
  children,
}: {
  children: React.ReactElement;
}) {
  const ctx = useField();
  if (!ctx) return children;
  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id: ctx.id,
    "aria-invalid": ctx.invalid || undefined,
    "aria-describedby": ctx.describedBy,
  });
}
