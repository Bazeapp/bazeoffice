import { cn } from "@/lib/utils"
import { FieldTitle } from "@/components/ui/field"

type ExperienceLevelProps = {
  label: string
  years: string
}

function getExperienceLevel(yearsValue: string) {
  const years = Number(yearsValue)
  if (!Number.isFinite(years)) {
    return {
      value: "-",
      tone: "muted" as const,
      activeSegments: 0,
    }
  }

  if (years < 2) {
    return {
      value: String(years),
      tone: "bad" as const,
      activeSegments: 1,
    }
  }

  if (years <= 8) {
    return {
      value: String(years),
      tone: "ok" as const,
      activeSegments: 2,
    }
  }

  return {
    value: String(years),
    tone: "top" as const,
    activeSegments: 3,
  }
}

function getToneClassName(tone: ReturnType<typeof getExperienceLevel>["tone"]) {
  switch (tone) {
    case "bad":
      return {
        value: "text-foreground",
        segment: "bg-orange-500",
      }
    case "ok":
      return {
        value: "text-foreground",
        segment: "bg-green-500",
      }
    case "top":
      return {
        value: "text-foreground",
        segment: "bg-emerald-600",
      }
    default:
      return {
        value: "text-muted-foreground",
        segment: "bg-muted-foreground/30",
      }
  }
}

export function ExperienceLevel({ label, years }: ExperienceLevelProps) {
  const level = getExperienceLevel(years)
  const tone = getToneClassName(level.tone)

  return (
    <div className="space-y-1.5">
      <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
        {label}
      </FieldTitle>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-semibold leading-none", tone.value)}>{level.value}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "size-1.5 rounded-full bg-muted",
                index < level.activeSegments && tone.segment
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
