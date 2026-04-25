"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import { Checkbox } from "./checkbox";

/**
 * AlertDialog — destructive confirmation surface.
 * Differs from Dialog by the icon header (red tonal) + opt-in
 * `requireConfirmation` checkbox that gates the destructive CTA.
 */
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[oklch(13%_0.006_85_/_0.45)] backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

interface AlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  icon?: React.ReactNode;
  tone?: "danger" | "warning";
}

const toneStyles = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
};

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, children, icon, tone = "danger", ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
        "rounded-[var(--radius-lg)] bg-[var(--surface)] p-5",
        "shadow-[0_0_0_1px_var(--border),var(--shadow-xl)]",
        "outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
              toneStyles[tone]
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="flex flex-col gap-1 flex-1">{children}</div>
      </div>
    </AlertDialogPrimitive.Content>
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-[var(--text-md)] font-semibold tracking-[var(--tracking-snug)] text-[var(--foreground-strong)]",
      className
    )}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-[var(--text-sm)] text-[var(--foreground-subtle)] leading-relaxed",
      className
    )}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

interface AlertDialogConfirmProps extends ButtonProps {
  requireConfirmation?: boolean;
  confirmationLabel?: React.ReactNode;
}

/**
 * Footer with optional "I understand" checkbox before the destructive CTA.
 */
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-5 flex flex-col gap-3",
      className
    )}
    {...props}
  />
);

const AlertDialogActions = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  ButtonProps
>(({ children, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel asChild>
    <Button ref={ref} variant="ghost" {...props}>
      {children}
    </Button>
  </AlertDialogPrimitive.Cancel>
));
AlertDialogCancel.displayName = "AlertDialogCancel";

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogConfirmProps>(
  (
    {
      requireConfirmation,
      confirmationLabel = "Confermo l'operazione",
      children,
      variant = "destructive-strong",
      ...props
    },
    ref
  ) => {
    const [confirmed, setConfirmed] = React.useState(false);
    const id = React.useId();

    return (
      <>
        {requireConfirmation ? (
          <label
            htmlFor={id}
            className={cn(
              "flex items-start gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-xs)]",
              "bg-[var(--danger-soft)] text-[var(--danger)] cursor-pointer"
            )}
          >
            <Checkbox
              id={id}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5 shadow-[inset_0_0_0_1px_var(--danger)]"
            />
            <span>{confirmationLabel}</span>
          </label>
        ) : null}
        <AlertDialogPrimitive.Action asChild>
          <Button
            ref={ref}
            variant={variant}
            disabled={requireConfirmation && !confirmed}
            {...props}
          >
            {children}
          </Button>
        </AlertDialogPrimitive.Action>
      </>
    );
  }
);
AlertDialogAction.displayName = "AlertDialogAction";

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogActions,
  AlertDialogCancel,
  AlertDialogAction,
};
