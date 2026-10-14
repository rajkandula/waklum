import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // 44px tall meets the minimum touch target on mobile.
        "flex h-11 w-full rounded-xl border border-surface-700/70 bg-panel px-3.5 py-2",
        "text-sm text-foreground placeholder:text-surface-500",
        "outline-none transition-[border-color,box-shadow,background-color] duration-200",
        "hover:border-surface-600",
        "focus:border-brand-500 focus:bg-panel focus:ring-4 focus:ring-brand-500/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
