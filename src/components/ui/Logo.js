"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Waklum mark: a vault dial with the W held upright at the centre.
 *
 * Only the tick ring and its index pointer rotate, so the letter never ends up
 * upside down. 30deg is exactly two of the 24 detents, which reads as the dial
 * being turned one notch to unlock. Motion is suppressed by the global
 * prefers-reduced-motion rule in globals.css.
 *
 * Gradient ids come from useId() because more than one Logo can be mounted at
 * once (the auth page renders one in the brand panel and one in the mobile
 * strip). With hardcoded ids the second instance resolves its fill against the
 * first definition, which sits inside a `display:none` container and renders
 * blank.
 */
export function Logo({ className, spin = true, ...props }) {
  const uid = useId().replace(/:/g, "")
  const face = `${uid}-face`
  const bevel = `${uid}-bevel`

  return (
    <svg viewBox="0 0 256 256" fill="none" role="img" aria-label="Waklum"
         className={cn("h-9 w-9", className)} {...props}>
      <defs>
        <linearGradient id={face} x1="36" y1="24" x2="220" y2="232" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="55%" stopColor="#2563eb"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id={bevel} x1="128" y1="16" x2="128" y2="240" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45"/>
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18"/>
        </linearGradient>
      </defs>

      <circle cx="128" cy="128" r="120" fill={`url(#${face})`}/>
      <circle cx="128" cy="128" r="120" fill={`url(#${bevel})`}/>

      {/* the part that turns */}
      <g className={cn("origin-center transition-transform duration-700 ease-out",
                       spin && "group-hover:rotate-[30deg]")}>
        <g transform="rotate(-90 128 128)">
          <circle cx="128" cy="128" r="104" fill="none" stroke="#ffffff" strokeOpacity="0.55"
                  strokeWidth="11" strokeLinecap="round" strokeDasharray="9 18.227"/>
        </g>
        <path d="M128 8 l11 19 h-22 z" fill="#ffffff" fillOpacity="0.92"/>
      </g>

      <circle cx="128" cy="128" r="86" fill="#ffffff" fillOpacity="0.10"/>
      <circle cx="128" cy="128" r="86" fill="none" stroke="#ffffff" strokeOpacity="0.30" strokeWidth="3"/>

      {/* W stays upright */}
      <path d="M80 92 l16 54 15.5-41 h13 l15.5 41 16-54 h17.5 l-25 80 h-15.5 l-14.5-38 -14.5 38 h-15.5 l-25-80 z"
            fill="#ffffff"/>
    </svg>
  )
}
