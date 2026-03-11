import { cn } from "@/lib/utils"

type ExperienceCardTitleProps = React.ComponentProps<"p">

export function ExperienceCardTitle({
  className,
  ...props
}: ExperienceCardTitleProps) {
  return (
    <p
      className={cn("text-base font-semibold leading-6 tracking-tight", className)}
      {...props}
    />
  )
}
