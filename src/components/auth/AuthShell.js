import Link from "next/link"
import { MessagesSquare, ListChecks, Brain } from "lucide-react"
import { Logo } from "@/components/ui/Logo"

/** What the name means. Shown on the brand panel and, condensed, on mobile. */
const MEANING = {
  pronunciation: "WAK-lum",
  origin: "Akkadian · c. 1900 BC",
  gloss: "overseer of works",
  story:
    "In ancient Assyria the waklum was the official who kept every project, crew and deadline on track. That is the job we handed to your AI.",
}

const VALUE_PROPS = [
  {
    icon: MessagesSquare,
    title: "Lives inside Claude and ChatGPT",
    body: "Connect once. No new app for your team to learn.",
  },
  {
    icon: ListChecks,
    title: "Creates the work, not just notes",
    body: "Projects, tasks, assignees and docs, straight from a conversation.",
  },
  {
    icon: Brain,
    title: "Remembers the context",
    body: "Decisions and preferences carry across chats, so you never re-explain.",
  },
]

/** The marketing half. Hidden below lg, where the condensed strip takes over. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-surface-100 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-purple-500 opacity-95" />
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-3">
        <Logo className="h-10 w-10" />
        <span className="text-lg font-semibold tracking-tight text-white">Waklum</span>
      </div>

      <div className="relative max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <span>{MEANING.pronunciation}</span>
          <span className="text-white/50" aria-hidden="true">•</span>
          <span className="text-white/80">{MEANING.origin}</span>
        </div>

        <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white">
          The {MEANING.gloss}.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/80">{MEANING.story}</p>

        <ul className="mt-10 space-y-5">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
                <Icon className="h-4.5 w-4.5 text-white" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-white/70">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/60">
        Your AI project manager, inside the chat you already use.
      </p>
    </aside>
  )
}

/** Condensed meaning strip for narrow screens, where the panel is hidden. */
function MobileMeaning() {
  return (
    <div className="mb-7 lg:hidden">
      <Link href="/" className="group mb-5 flex items-center justify-center gap-2.5 cursor-pointer">
        <Logo className="h-10 w-10" />
        <span className="text-lg font-semibold tracking-tight text-surface-100 transition-colors duration-200 group-hover:text-brand-600">
          Waklum
        </span>
      </Link>
      <p className="text-center text-xs leading-relaxed text-surface-400">
        <span className="font-medium text-surface-200">{MEANING.pronunciation}</span>
        {" · "}Akkadian for <span className="font-medium text-surface-200">{MEANING.gloss}</span>
        {" · "}your AI project manager inside Claude and ChatGPT
      </p>
    </div>
  )
}

/**
 * Two-column auth layout: the brand story on the left, the form on the right.
 * Below lg it collapses to the form alone with a one-line meaning strip above it.
 */
export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-2">
      <BrandPanel />

      <main className="flex min-h-screen items-center justify-center px-4 py-12 lg:min-h-0 lg:px-8">
        <div className="w-full max-w-[400px]">
          <MobileMeaning />

          <div className="mb-7 space-y-2 text-center lg:text-left">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-surface-100">{title}</h1>
            {description && <p className="text-sm leading-relaxed text-surface-400">{description}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-surface-400 lg:text-left">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

/** Inline form error, announced to screen readers as it appears. */
export function AuthError({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
      {children}
    </div>
  )
}

/** Label + field pairing used by every auth form. */
export function Field({ label, htmlFor, action, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-surface-200">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
