"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"

/**
 * Password field with a show/hide toggle.
 *
 * The toggle is type="button" so it never submits the surrounding form, and it
 * carries an aria-label because it has no visible text.
 */
const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg",
          "text-surface-500 hover:text-surface-200 hover:bg-surface-800/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          "cursor-pointer transition-colors duration-200"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
