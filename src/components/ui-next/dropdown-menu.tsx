"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * DropdownMenu — refresh primitive.
 *
 * Anatomy:
 *   <DropdownMenu>
 *     <DropdownMenuTrigger asChild><Button>…</Button></DropdownMenuTrigger>
 *     <DropdownMenuContent contextLabel="Famiglia · Aria Bocelli">
 *       <DropdownMenuItem icon={<EditIcon/>} shortcut="⌘E">Modifica</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuItem destructive icon={<TrashIcon/>}>Elimina</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 */
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  contextLabel?: React.ReactNode;
}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, contextLabel, children, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "ui-next z-50 min-w-[14rem] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)] p-1.5",
        "shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    >
      {contextLabel ? (
        <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-faint)]">
          {contextLabel}
        </div>
      ) : null}
      {children}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, icon, shortcut, destructive, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    data-destructive={destructive || undefined}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-sm)]",
      "px-2 py-1.5 text-[var(--text-sm)] text-[var(--foreground-strong)] outline-none",
      "data-[highlighted]:bg-[var(--accent-soft)] data-[highlighted]:text-[var(--accent-ink)]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "data-[destructive=true]:text-[var(--danger)]",
      "data-[destructive=true]:data-[highlighted]:bg-[var(--danger-soft)]",
      "[&_svg]:size-3.5 [&_svg]:shrink-0",
      className
    )}
    {...props}
  >
    {icon ? <span className="text-[var(--foreground-subtle)]">{icon}</span> : null}
    <span className="flex-1 truncate">{children}</span>
    {shortcut ? <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut> : null}
  </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-faint)]",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-[var(--border-subtle)]", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-[10px] font-medium tracking-wider text-[var(--foreground-faint)]",
      "rounded-[var(--radius-xs)] bg-[var(--neutral-100)] px-1.5 py-0.5 font-mono",
      className
    )}
    {...props}
  />
);

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    icon?: React.ReactNode;
  }
>(({ className, icon, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-sm)]",
      "px-2 py-1.5 text-[var(--text-sm)] text-[var(--foreground-strong)] outline-none",
      "data-[highlighted]:bg-[var(--accent-soft)] data-[highlighted]:text-[var(--accent-ink)]",
      "[&_svg]:size-3.5",
      className
    )}
    {...props}
  >
    {icon ? <span className="text-[var(--foreground-subtle)]">{icon}</span> : null}
    <span className="flex-1 truncate">{children}</span>
    <svg viewBox="0 0 16 16" className="size-3 text-[var(--foreground-faint)]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4l4 4-4 4" />
    </svg>
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "ui-next z-50 min-w-[12rem] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)] p-1.5",
      "shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
};
