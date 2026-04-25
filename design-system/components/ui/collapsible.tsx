"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { Button, type ButtonProps } from "./button";
import { cn } from "../../lib/utils";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleContent = CollapsiblePrimitive.Content;

interface CollapsibleTriggerProps extends Omit<ButtonProps, "variant"> {
  variant?: ButtonProps["variant"];
  showLabel?: React.ReactNode;
  hideLabel?: React.ReactNode;
  open?: boolean;
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  (
    {
      className,
      variant = "link",
      size = "sm",
      showLabel,
      hideLabel,
      open,
      children,
      ...props
    },
    ref
  ) => (
    <CollapsiblePrimitive.Trigger asChild>
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("group gap-1.5", className)}
        {...props}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3 transition-transform group-data-[state=open]:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
        <span className="group-data-[state=open]:hidden">{showLabel ?? children}</span>
        {hideLabel ? (
          <span className="hidden group-data-[state=open]:inline">{hideLabel}</span>
        ) : (
          <span className="hidden group-data-[state=open]:inline">{children}</span>
        )}
      </Button>
    </CollapsiblePrimitive.Trigger>
  )
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
