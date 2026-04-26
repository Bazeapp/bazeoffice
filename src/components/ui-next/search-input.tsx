"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

/**
 * SearchInput — derivato di `Input`.
 *
 * Wraps the default ui-next Input and overlays a leading magnifier icon.
 * When `onClear` is provided and `value` is non-empty, also shows a clear
 * button on the right.
 *
 * Tutti gli stili (h, surface, border, focus ring) sono ereditati da Input —
 * modifiche al primitivo Input si propagano automaticamente.
 */
export interface SearchInputProps extends InputProps {
  /** When provided and `value` is non-empty, shows a clear button that calls this. */
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const showClear =
      onClear != null && typeof value === "string" && value.length > 0;

    return (
      <div className="relative w-full">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--foreground-faint)]"
        />
        <Input
          ref={ref}
          value={value}
          className={cn("pl-9", showClear && "pr-11", className)}
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Cancella ricerca"
            className={cn(
              "absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)]",
              "text-[var(--foreground-subtle)] transition-colors",
              "hover:bg-[var(--neutral-100)] hover:text-[var(--foreground)]",
            )}
          >
            <XIcon className="size-3.5 pointer-events-none" />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
