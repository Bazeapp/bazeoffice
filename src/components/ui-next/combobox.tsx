"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Combobox — refresh primitive.
 *
 * Self-contained, built on Radix Popover. Controlled by `value` + `onValueChange`
 * with a built-in text filter on `option.label`.
 *
 *   <Combobox
 *     value={value}
 *     onValueChange={setValue}
 *     options={[{ value: "a", label: "Aria" }]}
 *     placeholder="Cerca..."
 *   />
 */

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onValueChange?: (next: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleziona...",
  emptyMessage = "Nessun risultato",
  disabled,
  invalid,
  clearable = true,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const handleSelect = (opt: ComboboxOption) => {
    if (opt.disabled) return;
    onValueChange?.(opt.value);
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onValueChange?.(null);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-invalid={invalid || undefined}
          data-state={open ? "open" : "closed"}
          className={cn(
            "group flex h-[var(--h-md)] w-full items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface)] px-3",
            "text-left text-[var(--text-sm)] text-[var(--foreground-strong)]",
            "shadow-[inset_0_0_0_1px_var(--border)]",
            "transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)]",
            "outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
            "data-[state=open]:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
            "disabled:bg-[var(--neutral-100)] disabled:text-[var(--foreground-faint)] disabled:cursor-not-allowed",
            "data-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]",
            className
          )}
        >
          <span
            className={cn(
              "flex-1 truncate",
              !selected && "text-[var(--foreground-faint)]"
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          {clearable && selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="flex size-4 items-center justify-center rounded-[var(--radius-xs)] text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)] hover:bg-[var(--neutral-150)]"
              aria-label="Clear selection"
            >
              <XIcon className="size-3" />
            </span>
          ) : null}
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 text-[var(--foreground-subtle)] transition-transform duration-[var(--duration-fast)]",
              "group-data-[state=open]:rotate-180"
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            "ui-next z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)] p-1",
            "text-[var(--text-sm)] text-[var(--foreground-strong)]",
            "shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]",
            "outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="px-1 pt-0.5 pb-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca..."
              className={cn(
                "h-[var(--h-sm)] w-full rounded-[var(--radius-sm)] bg-[var(--background-subtle)] px-2",
                "text-[var(--text-sm)] text-[var(--foreground-strong)]",
                "placeholder:text-[var(--foreground-faint)]",
                "outline-none focus:shadow-[inset_0_0_0_1px_var(--accent)]"
              )}
            />
          </div>
          <div
            role="listbox"
            className="max-h-[260px] overflow-y-auto p-0.5"
          >
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-[var(--text-xs)] text-[var(--foreground-faint)]">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5",
                      "text-left text-[var(--text-sm)] text-[var(--foreground-strong)]",
                      "outline-none transition-colors duration-[var(--duration-fast)]",
                      "hover:bg-[var(--neutral-100)] focus-visible:bg-[var(--neutral-100)]",
                      isSelected && "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
                      "disabled:opacity-50 disabled:pointer-events-none"
                    )}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <CheckIcon className="size-3.5 shrink-0 text-[var(--accent)]" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
