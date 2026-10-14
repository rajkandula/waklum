import { cn } from "@/lib/utils"

/**
 * Standard page heading for every dashboard screen: one H1, one supporting line,
 * and an optional action cluster on the right.
 */
export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 pb-2", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-surface-100">{title}</h1>
        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-surface-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
