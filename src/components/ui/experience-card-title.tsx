import { cn } from "@/lib/utils"

type ExperienceCardTitleProps = React.ComponentProps<"p">

export function ExperienceCardTitle({
  className,
  ...props
}: ExperienceCardTitleProps) {
  return (
    <p
      className={cn("text-sm font-semibold leading-5 tracking-tight", className)}
      {...props}
    />
  )
}
