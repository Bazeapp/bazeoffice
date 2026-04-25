"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  autoSize?: boolean;
}

/**
 * Textarea — same surface tokens as Input.
 * `autoSize` grows with content (no scrollbars until max-height).
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, autoSize, onInput, rows = 3, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const handleInput: React.TextareaHTMLAttributes<HTMLTextAreaElement>["onInput"] = (e) => {
      if (autoSize && innerRef.current) {
        innerRef.current.style.height = "auto";
        innerRef.current.style.height = innerRef.current.scrollHeight + "px";
      }
      onInput?.(e);
    };

    return (
      <textarea
        ref={innerRef}
        rows={rows}
        data-invalid={invalid || undefined}
        onInput={handleInput}
        className={cn(
          "block w-full rounded-[var(--radius-md)] bg-[var(--surface)] py-2 px-3",
          "text-[var(--text-sm)] text-[var(--foreground-strong)]",
          "shadow-[inset_0_0_0_1px_var(--border)]",
          "placeholder:text-[var(--foreground-faint)]",
          "transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
          "data-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]",
          autoSize ? "resize-none overflow-hidden" : "resize-y min-h-[80px]",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
