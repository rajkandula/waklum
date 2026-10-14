import { cn } from "@/lib/utils"

/**
 * Consistent "nothing here yet" panel. Always says what the thing is and what to
 * do next, rather than only stating that a list is empty.
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-700",
        "bg-surface-900/60 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-surface-800 text-surface-500">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-surface-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
