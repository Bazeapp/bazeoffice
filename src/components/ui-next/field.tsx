"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Separator } from "./separator";

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

const fieldVariants = cva(
  "data-[invalid=true]:text-destructive group/field flex w-full",
  {
    variants: {
      orientation: {
        vertical: "flex-col gap-1.5 *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center gap-1.5 *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col gap-1.5 *:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:*:data-[slot=field-label]:flex-auto",
      },
    },
    defaultVariants: { orientation: "vertical" },
  },
);

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldVariants> {
  invalid?: boolean;
}

export function Field({
  className,
  invalid = false,
  orientation = "vertical",
  children,
  ...props
}: FieldProps) {
  const id = React.useId();
  const helpId = `${id}-help`;
  return (
    <FieldContext.Provider value={{ id, invalid, describedBy: helpId }}>
      <div
        role="group"
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        className={cn(fieldVariants({ orientation }), className)}
        {...props}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-4 data-[slot=checkbox-group]:gap-2.5 *:data-[slot=field-group]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

export function FieldSet({
  className,
  ...props
}: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-3 has-[>[data-slot=checkbox-group]]:gap-2.5 has-[>[data-slot=radio-group]]:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

export function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn("ui-type-label mb-1", className)}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-left text-xs leading-normal font-normal",
        "[[data-variant=legend]+&]:-mt-1 last:mt-0 nth-last-2:-mt-1",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

export function FieldSeparator({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-1.5 h-4 text-xs group-data-[variant=outline]/field-group:-mb-1.5",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children ? (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      ) : null}
    </div>
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
