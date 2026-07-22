import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getLevelMeta,
  type SkillFieldConfig,
} from "../lib/skills-competenze"
import { getTagClassName, resolveLookupColor, type LookupOption } from "../lib/lookup-utils"

type SkillsCompetenzeLevelFieldProps = {
  config: SkillFieldConfig
  value: string
  isEditing: boolean
  isUpdating: boolean
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  onChange: (value: string) => void
}

function LevelReadOnlyValue({
  value,
  domain,
  lookupColorsByDomain,
}: {
  value: string
  domain: string
  lookupColorsByDomain: Map<string, string>
}) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  const levelMeta = getLevelMeta(value)

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface px-3 py-2.5">
      <Badge
        variant="outline"
        className={getTagClassName(resolveLookupColor(lookupColorsByDomain, domain, value))}
      >
        {value}
      </Badge>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 min-w-0 flex-1 rounded-full bg-muted-foreground/20",
              index < levelMeta.activeSegments && levelMeta.toneClassName,
            )}
          />
        ))}
      </div>
    </div>
  )
}

export function SkillsCompetenzeLevelField({
  config,
  value,
  isEditing,
  isUpdating,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  onChange,
}: SkillsCompetenzeLevelFieldProps) {
  const options = lookupOptionsByDomain.get(config.domain) ?? []

  return (
    <div className="flex items-center gap-3">
      <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide">
        {config.label}
      </p>
      {isEditing ? (
        <Select
          value={value || "none"}
          onValueChange={(nextValue) => onChange(nextValue === "none" ? "" : nextValue)}
          disabled={isUpdating}
        >
          <SelectTrigger className="min-w-32 flex-1">
            <SelectValue placeholder="Seleziona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non valutato</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="min-w-0 flex-1">
          <LevelReadOnlyValue
            value={value}
            domain={config.domain}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>
      )}
    </div>
  )
}
