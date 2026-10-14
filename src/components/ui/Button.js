import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
    "cursor-pointer select-none",
    "transition-[background-color,border-color,color,box-shadow,opacity] duration-200",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:border-brand-500",
    "disabled:pointer-events-none disabled:opacity-60"
  ),
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        outline: "border border-surface-700 bg-transparent text-foreground hover:bg-surface-800/70 hover:border-surface-600",
        secondary: "bg-surface-800 text-foreground hover:bg-surface-700",
        ghost: "text-surface-300 hover:bg-surface-800/70 hover:text-foreground",
        link: "text-brand-600 underline-offset-4 hover:underline hover:text-brand-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

/**
 * `loading` shows a spinner and disables the button, so callers no longer have to
 * hand-roll "Saving..." text and a separate disabled prop on every form.
 */
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      )
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
