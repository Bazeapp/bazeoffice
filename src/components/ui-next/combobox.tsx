"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
        "text-[var(--foreground-subtle)] transition-colors hover:text-[var(--foreground)]",
        "data-[popup-open]:text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronDownIcon className="size-4" />}
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={className}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-[70] pointer-events-auto"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "ui-next group/combobox-content pointer-events-auto",
            "flex flex-col overflow-hidden",
            "rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground-strong)]",
            "shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]",
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
            "data-closed:zoom-out-95 data-open:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
            "duration-100",
            "max-h-(--available-height) min-w-(--anchor-width) max-w-(--available-width)",
            "data-[chips=true]:min-w-(--anchor-width)",
            "origin-(--transform-origin)",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxSearch({
  className,
  placeholder,
  ...props
}: ComboboxPrimitive.Input.Props & { placeholder?: string }) {
  return (
    <div
      data-slot="combobox-search"
      className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5"
    >
      <SearchIcon className="size-3.5 shrink-0 text-[var(--foreground-faint)]" />
      <ComboboxPrimitive.Input
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[var(--text-sm)] outline-none",
          "placeholder:text-[var(--foreground-faint)]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-1",
        "data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "group/combobox-item",
        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2",
        "cursor-default outline-none select-none",
        "text-[var(--text-sm)] text-[var(--foreground)]",
        "data-highlighted:bg-[var(--neutral-100)]",
        "data-[selected]:bg-[var(--accent-soft)]",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&>[data-slot=combobox-item-count]]:ml-auto",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px]",
          "border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)]",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "group-data-[selected]/combobox-item:bg-[var(--accent)]",
          "group-data-[selected]/combobox-item:border-[var(--accent)]",
        )}
      >
        <CheckIcon
          className={cn(
            "size-3 text-white opacity-0",
            "group-data-[selected]/combobox-item:opacity-100",
          )}
        />
      </span>
      {children}
    </ComboboxPrimitive.Item>
  );
}

function ComboboxItemCount({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="combobox-item-count"
      className={cn(
        "shrink-0 text-[var(--text-xs)] tabular-nums text-[var(--foreground-faint)]",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("py-1", className)}
      {...props}
    />
  );
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        "px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
        "text-[var(--foreground-faint)]",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-3 text-center text-[var(--text-sm)]",
        "text-[var(--foreground-muted)]",
        "group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("my-1 h-px bg-[var(--border-subtle)]", className)}
      {...props}
    />
  );
}

function ComboboxFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="combobox-footer"
      className={cn(
        "flex items-center justify-between gap-2 border-t border-[var(--border-subtle)]",
        "bg-[var(--surface-sunken)] px-3 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5",
        "rounded-[var(--radius-md)] bg-[var(--surface)] px-2 py-1",
        "text-[var(--text-sm)]",
        "shadow-[inset_0_0_0_1px_var(--border)]",
        "transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus-within:shadow-[inset_0_0_0_1px_var(--accent),var(--shadow-ring)]",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-[var(--radius-sm)] px-2",
        "text-[var(--text-xs)] font-medium whitespace-nowrap",
        "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
        "shadow-[inset_0_0_0_1px_var(--accent-muted)]",
        "has-data-[slot=combobox-chip-remove]:pr-0.5",
        "has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          data-slot="combobox-chip-remove"
          className={cn(
            "ml-0.5 inline-flex size-4 items-center justify-center rounded",
            "text-[var(--accent-ink)] opacity-70 transition-opacity",
            "hover:bg-[var(--accent-muted)] hover:opacity-100",
            "data-pressed:bg-[var(--accent-muted)]",
          )}
        >
          <XIcon className="size-3 pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        "min-w-16 flex-1 bg-transparent outline-none",
        "placeholder:text-[var(--foreground-faint)]",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChipsTrigger({
  className,
  count,
  ...props
}: ComboboxPrimitive.Trigger.Props & { count?: number }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5">
      {count != null && count > 0 ? (
        <span className="text-[var(--text-xs)] font-medium tabular-nums text-[var(--foreground-faint)]">
          +{count}
        </span>
      ) : null}
      <ComboboxPrimitive.Trigger
        data-slot="combobox-chips-trigger"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded",
          "text-[var(--foreground-subtle)] transition-colors hover:text-[var(--foreground)]",
          "data-[popup-open]:text-[var(--foreground)]",
          className,
        )}
        {...props}
      >
        <ChevronDownIcon className="size-4" />
      </ComboboxPrimitive.Trigger>
    </div>
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxSearch,
  ComboboxList,
  ComboboxItem,
  ComboboxItemCount,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxFooter,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxChipsTrigger,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
