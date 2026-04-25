import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  BanIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleXIcon,
  Clock3Icon,
  FlameIcon,
  InboxIcon,
  PhoneCallIcon,
  PhoneForwardedIcon,
  SnowflakeIcon,
  TrophyIcon,
  UserRoundXIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type KanbanColumnStage = {
  id: string
  name: string
  color: string
  soft: string
  ink: string
  iconName?: string
}

const ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: FlameIcon,
  "phone-forwarded": PhoneForwardedIcon,
  clock: Clock3Icon,
  "phone-call": PhoneCallIcon,
  "calendar-clock": CalendarClockIcon,
  "calendar-plus": CalendarPlusIcon,
  "check-circle": CheckCircle2Icon,
  "user-x": UserRoundXIcon,
  snowflake: SnowflakeIcon,
  trophy: TrophyIcon,
  "circle-x": CircleXIcon,
  ban: BanIcon,
  inbox: InboxIcon,
}

function StageIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICON_REGISTRY[name]) || CircleDotIcon
  return <Icon className={className} />
}

const columnVariants = cva(
  "relative flex h-full shrink-0 flex-col overflow-hidden rounded-[14px] border transition-all duration-150",
  {
    variants: {
      variant: {
        accent:
          "border-[color-mix(in_oklch,var(--stage-color)_40%,transparent)] bg-white",
        chip: "border-border bg-white",
        minimal: "border-transparent bg-muted/40 shadow-none",
      },
      isDropTarget: {
        true: "scale-[1.015] shadow-md ring-2 ring-[color-mix(in_oklch,var(--stage-color)_55%,transparent)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "accent",
      isDropTarget: false,
    },
  },
)

const headerPadding = cva("flex items-start gap-2", {
  variants: {
    density: {
      compact: "px-3 pt-2.5 pb-2",
      comfy: "px-3.5 pt-3 pb-2.5",
      cozy: "px-4 pt-3.5 pb-3",
    },
  },
  defaultVariants: { density: "comfy" },
})

const bodyPadding = cva(
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
  {
    variants: {
      density: {
        compact: "space-y-2 px-2.5 pb-2.5 pt-1.5",
        comfy: "space-y-2.5 px-2.5 pb-3 pt-2",
        cozy: "space-y-3 px-3 pb-3.5 pt-2.5",
      },
    },
    defaultVariants: { density: "comfy" },
  },
)

type KanbanColumnProps = React.ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof columnVariants> & {
    stage: KanbanColumnStage
    count: number
    countLabel?: (n: number) => string
    density?: "compact" | "comfy" | "cozy"
    widthClassName?: string
    emptyState?: React.ReactNode
    footerAction?: React.ReactNode
    onDragEnterColumn?: (columnId: string) => void
    onDragOverColumn?: (columnId: string) => void
    onDragLeaveColumn?: (event: React.DragEvent<HTMLDivElement>) => void
    onDropColumn?: (columnId: string, payload: string | null) => void
  }

export function KanbanColumn({
  stage,
  count,
  countLabel,
  variant = "accent",
  density = "comfy",
  isDropTarget = false,
  widthClassName = "w-[292px]",
  emptyState,
  footerAction,
  children,
  className,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropColumn,
  ...rest
}: KanbanColumnProps) {
  const resolvedCountLabel =
    countLabel?.(count) ?? `${count} ${count === 1 ? "card" : "cards"}`
  const isEmpty = React.Children.count(children) === 0

  const stageStyle = {
    "--stage-color": stage.color,
    "--stage-soft": stage.soft,
    "--stage-ink": stage.ink,
  } as React.CSSProperties

  return (
    <div
      role="region"
      aria-label={`Stage ${stage.name}, ${resolvedCountLabel}`}
      className={cn(
        columnVariants({ variant, isDropTarget }),
        widthClassName,
        className,
      )}
      style={stageStyle}
      onDragEnter={(event) => {
        event.preventDefault()
        onDragEnterColumn?.(stage.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOverColumn?.(stage.id)
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault()
        const payload = event.dataTransfer.getData("text/plain") || null
        onDropColumn?.(stage.id, payload)
      }}
      {...rest}
    >
      {variant === "accent" ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "var(--stage-color)" }}
        />
      ) : null}

      <div className={headerPadding({ density })}>
        {variant === "chip" ? (
          <span
            className="rounded-full px-2 py-0.5 text-[12.5px] font-semibold"
            style={{
              background: "var(--stage-soft)",
              color: "var(--stage-ink)",
            }}
          >
            {stage.name}
          </span>
        ) : variant === "minimal" ? (
          <h2 className="text-[13px] font-semibold text-foreground">
            {stage.name}
          </h2>
        ) : (
          <>
            <StageIcon
              name={stage.iconName}
              className="mt-[3px] size-4 shrink-0"
            />
            <h2 className="min-h-8 flex-1 text-[13px] font-semibold leading-5 text-foreground">
              {stage.name}
            </h2>
          </>
        )}

        <span className="ml-auto shrink-0 text-[11.5px] font-medium text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>

      {variant !== "minimal" ? (
        <div
          aria-hidden="true"
          className={cn(
            "border-b",
            variant === "accent" ? "border-border/60" : "border-border",
            density === "compact" ? "mx-2.5" : "mx-3.5",
          )}
        />
      ) : null}

      <div className={bodyPadding({ density })}>
        {isEmpty
          ? emptyState ?? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                <InboxIcon className="size-5 opacity-70" />
                <span>Nessun contatto</span>
              </div>
            )
          : children}
      </div>

      {footerAction ? (
        <div
          className={cn(
            "border-t border-border/60 bg-background/60",
            density === "compact" ? "p-2" : "p-2.5",
          )}
        >
          {footerAction}
        </div>
      ) : null}
    </div>
  )
}
